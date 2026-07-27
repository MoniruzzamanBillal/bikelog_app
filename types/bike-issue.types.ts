import { TCloudinaryImage } from "./image.types";

export type TBikeIssueStatus = "open" | "resolved";

export type TBikeIssue = {
  _id: string;
  bike: string;
  title: string;
  description?: string;
  dateReported: string;
  status: TBikeIssueStatus;
  images?: (TCloudinaryImage & { _id: string })[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TCreateBikeIssuePayload = {
  title: string;
  description?: string;
  dateReported?: string;
};

export type TUpdateBikeIssuePayload = {
  title?: string;
  description?: string;
  dateReported?: string;
};

export type TUpdateBikeIssueStatusPayload = {
  status: TBikeIssueStatus;
};

export type TBikeIssuesApiResponse = {
  result: TBikeIssue[];
  meta: number;
};
