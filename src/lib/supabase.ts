import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
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
