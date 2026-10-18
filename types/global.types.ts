import { TCloudinaryImage } from "@/types/image.types";

export type IUser = {
  _id: string;
  name?: string;
  email: string;
  // ! Spec 56: was `string` and read by nothing. `bikelog_server` spec 53 stores and returns
  // ! `{ url, publicId }` — the same `TCloudinaryImage` shape as every other image in this
  // ! app — so the picker/viewer conventions apply to it unchanged. `null` is what the server
  // ! sends after a remove; `undefined` is a session stored before this spec, which is why
  // ! the Settings panel distinguishes the two when choosing a source to render from.
  profilePicture?: TCloudinaryImage | null;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
};

export type TUserRole = "user" | "admin";

export type TUserToken = {
  userId: string;
  userEmail: string;
  // ! Minted by the server into every login token (bikelog_server user.services.ts) and read
  // ! by its `adminCheck`. Absent from the stored `IUser` on purpose — see utils/isAdmin.ts.
  userRole?: TUserRole;
  // ! Spec 51: the server mints `type: "access"` into every access token it issues. Optional
  // ! because a token minted before that change carries no `type` claim at all, and the
  // ! server's own verifier treats a missing one as "access" for exactly that reason
  // ! (server spec 51 H8). Nothing in this app reads it — a refresh token never reaches
  // ! `jwtDecode`, since only `tokenStore` and the interceptor ever touch it.
  type?: "access";
  iat?: number;
  exp?: number;
};

export type TLoginPayload = {
  email: string;
  password: string;
};

export type TRegisterPayload = {
  name: string;
  email: string;
  password: string;
};
