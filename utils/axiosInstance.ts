import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { getBaseUrl } from "./envConfig";
import { queryClient } from "./queryClient";

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
    const token = await AsyncStorage.getItem("token");

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
    const sentAuth = error?.config?.headers?.Authorization;
    // ! Login/register answers are the user's own action, never "stale" — leave them alone.
    const isAuthEndpoint = /^\/auth\//.test(error?.config?.url ?? "");
    let isStale401 = false;

    if (error?.response?.status === 401) {
      const currentToken = await AsyncStorage.getItem("token");
      const isCurrentSession =
        !!sentAuth && !!currentToken && sentAuth === `Bearer ${currentToken}`;

      if (isCurrentSession) {
        await AsyncStorage.removeItem("user");
        await AsyncStorage.removeItem("token");
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
