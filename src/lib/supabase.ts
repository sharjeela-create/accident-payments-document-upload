import { createClient } from '@supabase/supabase-js';
import type { DocumentCategory, UploadedDoc } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

export async function deleteUploadedDocument(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete document",
    };
  }
}

export async function listUploadedDocuments(params: {
  submissionId: string;
  category: DocumentCategory;
}): Promise<{ docs: UploadedDoc[]; error?: string }> {
  try {
    const folderPath = `${params.submissionId}/${params.category}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      return { docs: [], error: error.message };
    }

    const docs: UploadedDoc[] = (data ?? [])
      .filter((item) => Boolean(item.name) && item.name !== ".emptyFolderPlaceholder")
      .map((item) => {
        const id = `${folderPath}/${item.name}`;
        return {
          id,
          category: params.category,
          fileName: item.name,
          fileSize: typeof item.metadata?.size === "number" ? item.metadata.size : 0,
          createdAt: item.created_at ?? new Date().toISOString(),
        };
      });

    return { docs };
  } catch (err) {
    return {
      docs: [],
      error: err instanceof Error ? err.message : "Failed to list documents",
    };
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const STORAGE_BUCKET = 'lead-documents';

/**
 * Upload a document to Supabase Storage
 * @param submissionId - The submission ID (used as folder name)
 * @param category - Document category (police_report, insurance_document, medical_report)
 * @param file - The file to upload
 * @returns Object with success status, file path, and any error
 */
export async function uploadDocument(
  submissionId: string,
  category: string,
  file: File
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Generate unique filename with timestamp to avoid collisions
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${submissionId}/${category}/${timestamp}_${sanitizedFileName}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, path: data.path };
  } catch (err) {
    console.error('Upload exception:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Get a public URL for a document (if bucket is public)
 * For private buckets, use getSignedUrl instead
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get a signed URL for private document access (expires in 1 hour)
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { error: error.message };
    }

    return { url: data.signedUrl };
  } catch (err) {
    return { 
      error: err instanceof Error ? err.message : 'Failed to generate signed URL' 
    };
  }
}

/**
 * Delete a document from Supabase Storage
 * @param storagePath - The path of the document to delete
 * @returns Object with success status and any error
 */
export async function deleteDocument(storagePath: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
