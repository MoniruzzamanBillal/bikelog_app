export type TAccessoryUrgency = "immediate" | "medium" | "low";
export type TAccessoryStatus = "pending" | "purchased" | "cancelled";

export type TBikeAccessory = {
  _id: string;
  bike: string;
  name: string;
  urgency: TAccessoryUrgency;
  status: TAccessoryStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TCreateBikeAccessoryPayload = {
  name: string;
  urgency: TAccessoryUrgency;
  status?: TAccessoryStatus;
};

export type TUpdateBikeAccessoryPayload = {
  name?: string;
  urgency?: TAccessoryUrgency;
  status?: TAccessoryStatus;
};

export type TBikeAccessoriesApiResponse = {
  result: TBikeAccessory[];
  meta: number;
};
