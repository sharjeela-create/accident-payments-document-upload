export type DocumentCategory = "police_report" | "insurance_document" | "medical_report";

export type UploadedDoc = {
  id: string;
  category: DocumentCategory;
  fileName: string;
  fileSize: number;
  createdAt: string;
};

export type RequestStatus = {
  requestId: string;
  token: string;
  expiresAt: string | null;
  requirements: Partial<Record<DocumentCategory, boolean>>;
  uploaded: Record<DocumentCategory, UploadedDoc[]>;
};
