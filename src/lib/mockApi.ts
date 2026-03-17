import type { DocumentCategory, RequestStatus, UploadedDoc } from "@/lib/types";
import {
  uploadDocument as uploadToSupabase,
  listUploadedDocuments,
  deleteUploadedDocument,
} from "@/lib/supabase";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const nowIso = () => new Date().toISOString();

const makeId = () =>
  Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);

const mockDb: Record<string, RequestStatus> = {};

function ensureSubmission(submissionId: string) {
  if (!mockDb[submissionId]) {
    mockDb[submissionId] = {
      requestId: `req_${makeId()}`,
      token: submissionId,
      expiresAt: null,
      requirements: {
        police_report: true,
        insurance_document: true,
        medical_report: false,
      },
      uploaded: {
        police_report: [],
        insurance_document: [],
        medical_report: [],
      },
    };
  }
  return mockDb[submissionId];
}

async function hydrateUploadedFromSupabase(status: RequestStatus): Promise<RequestStatus> {
  const next: RequestStatus = {
    ...status,
    uploaded: {
      police_report: [],
      insurance_document: [],
      medical_report: [],
    },
  };

  const [police, insurance, medical] = await Promise.all([
    listUploadedDocuments({ submissionId: status.token, category: "police_report" }),
    listUploadedDocuments({ submissionId: status.token, category: "insurance_document" }),
    listUploadedDocuments({ submissionId: status.token, category: "medical_report" }),
  ]);

  if (!police.error) next.uploaded.police_report = police.docs;
  if (!insurance.error) next.uploaded.insurance_document = insurance.docs;
  if (!medical.error) next.uploaded.medical_report = medical.docs;

  return next;
}

export async function resolveRequest(params: {
  submissionId: string;
  passcode: string;
}): Promise<RequestStatus> {
  await sleep(700);

  const passcode = params.passcode.trim();
  if (passcode.length < 4) {
    throw new Error("Invalid passcode. Please try again.");
  }

  const submissionId = params.submissionId.trim();
  if (!submissionId) {
    throw new Error("Invalid link.");
  }

  const status = ensureSubmission(submissionId);
  return hydrateUploadedFromSupabase(status);
}

export async function uploadDocument(params: {
  submissionId: string;
  category: DocumentCategory;
  file: File;
  onProgress: (pct: number) => void;
}): Promise<UploadedDoc> {
  const status = ensureSubmission(params.submissionId);

  params.onProgress(0);
  await sleep(100);

  const submissionId = params.submissionId;

  params.onProgress(10);

  // Upload to Supabase Storage
  const uploadResult = await uploadToSupabase(
    submissionId,
    params.category,
    params.file
  );

  if (!uploadResult.success) {
    throw new Error(uploadResult.error || 'Upload failed');
  }

  // Simulate progress for better UX
  params.onProgress(90);
  await sleep(200);

  const storagePath = uploadResult.path;
  if (!storagePath) {
    throw new Error("Upload failed");
  }

  const doc: UploadedDoc = {
    id: storagePath,
    category: params.category,
    fileName: storagePath.split("/").pop() ?? params.file.name,
    fileSize: params.file.size,
    createdAt: nowIso(),
  };

  status.uploaded[params.category] = [doc, ...status.uploaded[params.category]];
  params.onProgress(100);
  return doc;
}

export async function getStatus(submissionId: string): Promise<RequestStatus> {
  await sleep(300);
  const status = ensureSubmission(submissionId);
  return hydrateUploadedFromSupabase(status);
}

export async function completeUpload(submissionId: string): Promise<void> {
  await sleep(500);
  const status = ensureSubmission(submissionId);
  
  // In production, this would:
  // 1. Update lead_document_requests status to 'completed'
  // 2. Set expires_at to NOW() to expire the passcode
  // 3. Log event in lead_document_request_events
  
  // Mark as expired to prevent further uploads
  status.expiresAt = nowIso();
}

export async function deleteDocument(params: {
  submissionId: string;
  category: DocumentCategory;
  documentId: string;
}): Promise<void> {
  await sleep(300);
  const deleteResult = await deleteUploadedDocument(params.documentId);
  if (!deleteResult.success) {
    throw new Error(deleteResult.error || "Failed to delete document");
  }
}
