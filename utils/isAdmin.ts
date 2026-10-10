import { TUserToken } from "@/types/global.types";
import { jwtDecode } from "jwt-decode";

/**
 * Mirrors the server's `middleware/adminCheck.ts`, which is a pure JWT-claim check
 * (`req.user.userRole === "admin"`). Reading the same claim from the same token means the UI
 * never offers an admin action the API then 403s.
 *
 * Why the token and not a field on the stored `IUser`: the server already mints `userRole`
 * into every login token, so an admin who is *already* logged in has the claim now — the
 * entry appears without a logout/login, and there is no second copy of the role to go stale.
 *
 * An undecodable token is "not admin" rather than a throw: this runs during render.
 */
export const isAdminToken = (token?: string | null): boolean => {
  if (!token) return false;

  try {
    return jwtDecode<TUserToken>(token)?.userRole === "admin";
  } catch {
    return false;
  }
};
