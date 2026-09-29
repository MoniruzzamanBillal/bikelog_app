export type TBikeManualMeta = {
  url: string;
  publicId: string;
  originalName: string;
  uploadedAt: string;
  chunkCount: number;
};

export type TBikeManualStatus = {
  hasManual: boolean;
  manual: TBikeManualMeta | null;
};
