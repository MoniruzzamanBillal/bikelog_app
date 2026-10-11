import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { IUser } from "@/types/global.types";
import { queryClient } from "@/utils/queryClient";
import { registerPushToken } from "@/utils/registerPushToken";
import { clearTokens, getAccessToken, setTokens } from "@/utils/tokenStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

type IUserProviderValues = {
  user: IUser | null;
  setUser: (user: IUser | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  handleSetUser: (user: IUser | null) => void;
  // ! Spec 51: both tokens arrive together from login. `token` in this context value keeps
  // ! meaning the **access** token; the refresh token is deliberately not exposed here —
  // ! only `tokenStore` and the interceptor ever need it.
  handleSetTokens: (tokens: {
    accessToken: string | null;
    refreshToken?: string | null;
  }) => void;
  logoutFunction: () => void;
};

const UserContext = createContext<IUserProviderValues | undefined>(undefined);

const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const registeredPushForUserId = useRef<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      // ! Spec 51 §D: hydrates through `tokenStore`, which also migrates a pre-spec-51
      // ! install's legacy `"token"` key on the way (H-C), so an existing install is not
      // ! logged out by the update itself.
      // ! No expiry check and no pre-emptive refresh here, on purpose. A cold launch after a
      // ! week simply mounts; the first query goes out on the stale access token, the server
      // ! 401s, and the interceptor's row 3 recovers it. The cost is one doomed round trip
      // ! before the first screen's data arrives — V4 in the spec is what measures whether
      // ! that is visible on a device.
      const storedToken = await getAccessToken();

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }

      setIsLoading(false);
    };

    loadUserData();
  }, []);

  // ! registers this device's Expo push token once per user per app session, once a real
  // ! session exists — covers both the post-login case and an already-stored session on cold
  // ! launch.
  // ! Keyed on the user rather than a once-ever boolean (spec 51c §5c): A logging out and B
  // ! logging in without a force-kill left the old flag set, so B's device never registered
  // ! and B silently got no weekly summaries. A boolean reset in `logoutFunction` would not
  // ! have been enough either — row 4 and a refused refresh both end a session from inside
  // ! the interceptor, outside React, where a ref cannot be touched.
  useEffect(() => {
    if (user && token && registeredPushForUserId.current !== user._id) {
      registeredPushForUserId.current = user._id;
      registerPushToken();
    }
  }, [user, token]);

  // Store user in localStorage when set
  const handleSetUser = async (user: IUser | null) => {
    setUser(user);
    if (user) {
      await AsyncStorage.setItem("user", JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem("user");
    }
  };

  // Store both tokens when a session starts
  const handleSetTokens = async ({
    accessToken,
    refreshToken,
  }: {
    accessToken: string | null;
    refreshToken?: string | null;
  }) => {
    setToken(accessToken);
    if (accessToken) {
      // ! A new session starts from an empty cache. Clearing on login is the stronger
      // ! guarantee than clearing on logout alone: logout can be skipped (force-kill, token
      // ! expiry, crash), login cannot (spec 48 §A).
      queryClient.clear();
      // ! Spec 51 §E: a missing `refreshToken` is not an error. The server deploys *after*
      // ! this build (server spec 51 §H), so every login until then answers without one, and
      // ! that has to behave exactly as it does today — a session that dies at expiry.
      await setTokens({ accessToken, refreshToken });
    } else {
      await clearTokens();
    }
  };

  // ! for logout a user
  const logoutFunction = async () => {
    try {
      await AsyncStorage.removeItem("user");
      // ! Spec 51 §D: both tokens plus the legacy key. There is no server call — the server
      // ! stores no session, so it has nothing to invalidate (server spec 51 §A).
      await clearTokens();
      queryClient.clear();
      setUser(null);
      setToken(null);
    } catch (error) {
      console.log("something went wrong while logging out !!!");
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        token,
        setUser,
        setToken,
        handleSetUser,
        handleSetTokens,
        setIsLoading,
        logoutFunction,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error(
      "useUserContext must be used within the UserProvider context",
    );
  }

  return context;
};

export default UserProvider;
