import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { getBaseUrl } from "./envConfig";
import { queryClient } from "./queryClient";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokenStore";

const instance = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

instance.defaults.headers.post["Content-Type"] = "application/json";
instance.defaults.timeout = 60000;

// Request interceptor
instance?.interceptors?.request?.use(
  async function (config) {
    // <========
    // If the request is a POST request and the data is not FormData,
    // set Content-Type to application/json
    // ========>
    if (!(config?.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    } else {
      // Let the browser set the correct multipart boundary
      config.headers["Content-Type"] = "multipart/form-data";
    }

    // Skip adding Authorization header for login endpoint
    // ! Spec 51: whatever access token is stored goes out as-is. This never inspects `exp`
    // ! to decide whether to send — the flow is reactive: send, let the server 401, refresh,
    // ! retry (spec 51 "The flow" step 1). No proactive refresh here either; doing it per
    // ! request would serialise every call behind a storage read plus a network round trip.
    const token = await getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  function (error) {
    console.log("error from axios instance = ", error);
    return Promise.reject(error);
  },
);

/**
 * ! Spec 51b: three outcomes, not two. A refresh that the server **refuses** means the
 * ! session is over; a refresh we could not even deliver says nothing at all about the
 * ! session, and treating the two alike deleted a valid 15-day credential every time a
 * ! rider's signal dropped at the wrong moment. The flow's own step 3 is the authority:
 * ! log out when the server refuses, not when we fail to ask.
 */
type TRefreshOutcome =
  | { status: "refreshed"; accessToken: string }
  | { status: "refused" } // the server answered — the session really is over
  | { status: "unreachable" }; // no answer at all — says nothing about the session

// ! Spec 51 §C: one refresh call at a time. An expiry hits every mounted screen at once, so
// ! without this latch a burst of 401s would fire a refresh each — and all but one would be
// ! spending an already-used round trip. Concurrent callers share the one in-flight promise,
// ! and since spec 51b that promise carries the outcome, so every member of a burst learns
// ! the same thing rather than just "it didn't work".
let refreshInFlight: Promise<TRefreshOutcome> | null = null;

async function refreshAccessToken(): Promise<TRefreshOutcome> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async (): Promise<TRefreshOutcome> => {
    try {
      const refreshToken = await getRefreshToken();
      // ! Not a transport failure: there is nothing to ask with, so the session really is
      // ! over. This is the legacy-install case (spec 51 H-C) and V7.
      if (!refreshToken) {
        return { status: "refused" };
      }

      // ! bare axios, NOT axiosInstance — going through the instance would re-enter these
      // ! interceptors and, on a 401 from the refresh call itself, recurse.
      // ! The explicit timeout is load-bearing (spec 51b §3c): bare axios does NOT inherit
      // ! `instance.defaults.timeout`, and global axios has none, so a half-open connection
      // ! could hang here forever — taking the whole latched burst of 401ed requests with
      // ! it, since they are all awaiting this one promise.
      const res = await axios.post(
        `${getBaseUrl()}/auth/refresh-token`,
        { refreshToken },
        { timeout: 20000 },
      );

      const nextAccessToken = res?.data?.token;
      // ! A 200 with no token is a broken contract we cannot proceed on — the server has
      // ! answered, so this is a refusal rather than a transport failure.
      if (!nextAccessToken) {
        return { status: "refused" };
      }

      // ! The refresh token is not rotated and not echoed back (server spec 51 §A), so only
      // ! the access token is written here.
      await setTokens({ accessToken: nextAccessToken });
      return { status: "refreshed", accessToken: nextAccessToken };
    } catch (error: any) {
      // ! The one question the whole fix rests on: did the server answer at all? A 401, any
      // ! other status, or a malformed body all carry `error.response`. DNS failure, a
      // ! refused connection, an offline radio and the timeout above do not.
      return error?.response ? { status: "refused" } : { status: "unreachable" };
    } finally {
      // ! Must clear on success too, or one refresh per app session is all that ever happens.
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

instance?.interceptors?.response?.use(
  // ✅ Handle success
  //@ts-expect-error: response type is not always consistent
  function (response) {
    return {
      data: response?.data,
      meta: response?.data?.meta,
    };
  },

  // ❌ Handle errors
  async function (error) {
    // ! Spec 48a: a 401 only means "this session expired" if the request that failed was sent
    // ! with the session that is current RIGHT NOW. `logoutFunction` clears the query cache
    // ! while the old screens are still mounted, so they refetch with no token; those 401s
    // ! used to wipe whatever session existed when they landed — including a user who had
    // ! just logged in on a slow connection. A 401 for any other token is a stale leftover.
    // ! Spec 51 §C extends that rule rather than replacing it: the conclusion still holds, but
    // ! a 401 sent with the *current* access token is now first a chance to refresh, and a 401
    // ! sent with a superseded token may simply have raced a refresh, so it is retried once
    // ! with the current one instead of being discarded. The decision table is in that spec.
    const sentAuth = error?.config?.headers?.Authorization;
    // ! Login/register answers are the user's own action, never "stale" — leave them alone.
    // ! They are also never refreshed: /auth/refresh-token's own 401 must not trigger another
    // ! refresh, and login/register have no session to recover.
    const isAuthEndpoint = /^\/auth\//.test(error?.config?.url ?? "");
    let isStale401 = false;
    // ! Spec 51b: set when a refresh could not be delivered at all. It bars row 4 — a
    // ! network blip must never cost the rider their session.
    let refreshUnreachable = false;

    if (error?.response?.status === 401) {
      const currentToken = await getAccessToken();
      const isCurrentSession =
        !!sentAuth && !!currentToken && sentAuth === `Bearer ${currentToken}`;
      // ! Spec 51 H-E: one retry, ever. A retried request that 401s again falls through to
      // ! the logout path (row 4) or the inert path (row 6) — it is never retried twice, so
      // ! an endpoint that always 401s cannot loop.
      const canRetry =
        !!error?.config && !isAuthEndpoint && error.config.__isRetry !== true;

      if (isCurrentSession && canRetry) {
        // ! Row 3: the current token expired. Refresh and replay the original request, so the
        // ! caller gets a success it never knew was briefly a 401. Going back through the
        // ! instance (rather than re-issuing by hand) is load-bearing: the request
        // ! interceptor re-reads the new token for us, and the success interceptor above
        // ! reshapes to `{ data, meta }`, which is what `utils/api.ts` unwraps. A hand-rolled
        // ! retry would return a raw axios response and break every screen in a way `tsc`
        // ! cannot catch.
        const outcome = await refreshAccessToken();

        if (outcome.status === "refreshed") {
          error.config.__isRetry = true;
          return instance.request(error.config);
        }

        // ! Row 3b (spec 51b): we never got an answer, so we know nothing about the session.
        // ! Leave both tokens alone and fall through to the inert path below — not to row 4,
        // ! which would delete a refresh token that is almost certainly still valid.
        refreshUnreachable = outcome.status === "unreachable";
        // ! `refused` falls through to row 4: the refresh token is gone, expired or rejected,
        // ! and that is the pre-spec-51 behaviour, unchanged.
      }

      if (
        !isCurrentSession &&
        !isAuthEndpoint &&
        !!sentAuth &&
        !!currentToken &&
        canRetry
      ) {
        // ! Row 5: this request left with a token that has since been replaced — it raced a
        // ! refresh. Spec 48a made every non-current 401 inert, which is right for a
        // ! logged-out session but needlessly throws away a request that was only unlucky.
        // ! Retry it once with the current token.
        // ! Both guards are load-bearing for H-D. `sentAuth` must be *present*: a request
        // ! that carried no Authorization header at all never raced anything — it is a
        // ! post-logout refetch from a screen that is still mounted, and retrying it would
        // ! re-arm the session the user just ended. `currentToken` must exist too, or there
        // ! is nothing to retry with. Those refetches therefore fall through to row 6 and
        // ! stay exactly as inert as spec 48a shipped them.
        error.config.__isRetry = true;
        return instance.request(error.config);
      }

      if (isCurrentSession && !refreshUnreachable) {
        // ! Row 4: no refresh token, or the refresh was refused. Today's path, unchanged.
        await AsyncStorage.removeItem("user");
        await clearTokens();
        // ! This path never goes through logoutFunction, so without this the whole cache
        // ! survives a 401 and the next login would briefly render the old user's data
        // ! (spec 48 §A).
        queryClient.clear();

        Toast.show({
          type: "error",
          text1: "Token expired , please login ",
          position: "top",
        });

        router.replace("/auth");
      } else if (!isAuthEndpoint) {
        // ! Row 6: no current session at all (the post-logout refetches of H-D), or a stale
        // ! request that has already had its one retry. Inert: no storage write, no cache
        // ! clear, no redirect, no toast.
        // ! Since spec 51b this also catches an undeliverable refresh, and suppressing the
        // ! toast matters there: `errorObj.message` comes from the original 401, so without
        // ! it the rider stays logged in and is simultaneously told "Token expired , please
        // ! login " — a message that contradicts the screen in front of them. The request
        // ! still rejects, so that screen shows its own error state and can be retried.
        isStale401 = true;
      }
    }

    const errorObj = {
      statusCode: error?.response?.data?.statusCode || 500,
      message: error?.response?.data?.message || "Something went wrong",
      errors: error?.response?.data?.errors,
    };

    // ! A 409 means the server *refused* the request, not that something broke — show it
    // ! amber rather than red (spec 45 §3). Confirmed app-wide with the user: this also
    // ! recolours the existing duplicate-name conflicts on catalog create/update, which is
    // ! the intended reading of a 409.
    // ! Reads `error.response.status`, NOT `errorObj.statusCode` — globalErrorHandler sends
    // ! `{ success, message, errorSources, stack }` with no `statusCode`, so the field below
    // ! is always its 500 fallback and can never identify a 409.
    // ! A stale 401 (spec 48a) is not something the user did or can act on — no toast.
    if (!isStale401) {
      Toast.show({
        type: error?.response?.status === 409 ? "warning" : "error",
        text1: errorObj?.message,
        position: "top",
      });
    }

    return Promise.reject(errorObj);
  },
);

export { instance as axiosInstance };
