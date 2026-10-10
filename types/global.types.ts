export type IUser = {
  _id: string;
  name?: string;
  email: string;
  profilePicture?: string;
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
