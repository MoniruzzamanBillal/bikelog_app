import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The one owner of both auth tokens (spec 51 §B). Nothing else in the app reads or writes
 * auth tokens from storage — `axiosInstance.ts` and `user.context.tsx` both go through here.
 *
 * ! AsyncStorage on every platform, native and web alike (spec 51 decision 3).
 * ! No expo-secure-store: no new native module, no EAS rebuild, no Platform.OS branch, and
 * ! the `expo export --platform web` verification path keeps working (spec 51 H-A, H-B).
 * ! The cost is at-rest encryption for the 15-day refresh token, accepted and written out in
 * ! the spec's §B along with the one-file upgrade path back to the Keychain.
 *
 * Every call is wrapped: a storage failure degrades to "no token" rather than throwing from
 * inside an interceptor, where there is nobody to catch it.
 */
const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
// ! Pre-spec-51 installs stored the single long-lived token here (spec 51 H-C).
const LEGACY_KEY = "token";

/**
 * The access token, migrating a pre-spec-51 install's legacy key on the way (H-C).
 *
 * An existing install arrives here with a `token` and no `accessToken`: copy it across and
 * delete the old key, so the rider keeps their session instead of being logged out by the
 * update itself. They keep it with **no** refresh token, so when that 10-day token expires
 * they are logged out once — exactly what happens today. All three keys live in the same
 * store, so this can never half-succeed across two stores.
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    const accessToken = await AsyncStorage.getItem(ACCESS_KEY);
    if (accessToken) {
      return accessToken;
    }

    const legacyToken = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacyToken) {
      return null;
    }

    await AsyncStorage.setItem(ACCESS_KEY, legacyToken);
    await AsyncStorage.removeItem(LEGACY_KEY);
    return legacyToken;
  } catch {
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
};

/**
 * Writes the access token, and the refresh token only when one is supplied.
 *
 * A refresh exchange sends no refresh token back (server spec 51 §A — it is unchanged and
 * deliberately not rotated), so `setTokens({ accessToken })` must leave the stored one alone
 * rather than clearing it. Login is the one caller that passes both, and it also drops the
 * legacy key: once a fresh pair is stored, an old `token` left behind would be a
 * resurrectable session (same reasoning as `clearTokens`).
 */
export const setTokens = async ({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken?: string | null;
}): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACCESS_KEY, accessToken);

    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
      await AsyncStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    // ! Nothing useful to do here: the caller is an interceptor or a login handler, and a
    // ! failed write simply means the next request goes out unauthenticated and 401s.
  }
};

// ! The legacy key too — otherwise a logout leaves a token behind that `getAccessToken`
// ! would happily migrate back into a live session on the next request (spec 51 §B).
export const clearTokens = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, LEGACY_KEY]);
  } catch {
    // ! Same as above — a logout must never throw at the caller.
  }
};
