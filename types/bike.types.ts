export type TBike = {
  _id: string;
  owner: string;
  nickname: string;
  brand: string;
  model: string;
  registrationNumber: string;
  purchaseDate: string;
  fuelTankCapacityLiters: number;
  currentOdometer: number;
  initialOdometer: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TCreateBikePayload = {
  nickname: string;
  brand: string;
  model: string;
  registrationNumber: string;
  purchaseDate: string;
  fuelTankCapacityLiters: number;
  currentOdometer?: number;
};

export type TUpdateBikePayload = Partial<
  Omit<TCreateBikePayload, "currentOdometer">
>;
