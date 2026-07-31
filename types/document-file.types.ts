export type TDocumentFile = {
  _id: string;
  url: string;
  publicId: string;
  resourceType: "image" | "raw";
  originalName: string;
  mimeType: string;
};

export type TPickedFile = { uri: string; name: string; type: string };
