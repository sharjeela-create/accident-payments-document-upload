import type { DocumentCategory, RequestStatus, UploadedDoc } from "@/lib/types";
import { uploadDocument as uploadToSupabase } from "@/lib/supabase";

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

  return ensureSubmission(submissionId);
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

  const doc: UploadedDoc = {
    id: `doc_${makeId()}`,
    category: params.category,
    fileName: params.file.name,
    fileSize: params.file.size,
    createdAt: nowIso(),
  };

  status.uploaded[params.category] = [doc, ...status.uploaded[params.category]];
  params.onProgress(100);
  return doc;
}

export async function getStatus(submissionId: string): Promise<RequestStatus> {
  await sleep(300);
  return ensureSubmission(submissionId);
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
  const status = ensureSubmission(params.submissionId);
  
  // Find the document to get storage path
  const docIndex = status.uploaded[params.category].findIndex(
    (doc) => doc.id === params.documentId
  );
  
  if (docIndex === -1) {
    throw new Error('Document not found');
  }
  
  // In production, this would:
  // 1. Delete from Supabase Storage
  // 2. Delete from lead_documents table
  // 3. Log event in lead_document_request_events
  
  // For now, just remove from mock database
  status.uploaded[params.category].splice(docIndex, 1);
}
