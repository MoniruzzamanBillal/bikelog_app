import { TDocumentFile } from "./document-file.types";

export type IBikeDocument = {
  _id: string;
  bike: string;
  title: string;
  description?: string;
  expiryDate?: string;
  files?: TDocumentFile[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TCreateBikeDocumentPayload = {
  title: string;
  description?: string;
  expiryDate?: string;
};

export type TUpdateBikeDocumentPayload = Partial<TCreateBikeDocumentPayload>;

export type TBikeDocumentsApiResponse = {
  result: IBikeDocument[];
  meta: number;
};
