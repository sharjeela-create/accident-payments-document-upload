# Supabase Setup Guide

## 1. Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Use these settings:

   - **Bucket name:** `lead-documents`
   - **Public bucket:** ❌ No (keep private for security)
   - **Restrict file size:** ✅ Yes, set to **10 MB**
   - **Restrict MIME types:** ✅ Yes, add these types:
     - `application/pdf`
     - `image/png`
     - `image/jpeg`

5. Click **Create bucket**

## 2. Set Up RLS Policies (Row Level Security)

Since this is a private bucket, you'll need to configure policies for access:

### Option A: Service Role Access (Recommended for now)
For the initial implementation, uploads will use the anon key with appropriate policies.

### Option B: Custom Policies
Add these policies to the `lead-documents` bucket:

**Policy 1: Allow uploads**
```sql
-- Allow authenticated uploads to their own submission folder
CREATE POLICY "Allow uploads to submission folder"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'lead-documents'
);
```

**Policy 2: Allow reads**
```sql
-- Allow reading files (for internal portal use)
CREATE POLICY "Allow reads for authenticated users"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'lead-documents');
```

## 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Get your credentials from:
   - Supabase Dashboard → Settings → API
   - Copy **Project URL** and **anon/public** key

## 4. File Storage Structure

Files will be organized as:
```
lead-documents/
├── {submission_id}/
│   ├── police_report/
│   │   ├── 1234567890_accident_report.pdf
│   │   └── 1234567891_police_statement.pdf
│   ├── insurance_document/
│   │   ├── 1234567892_policy.pdf
│   │   └── 1234567893_claim_form.pdf
│   └── medical_report/
│       ├── 1234567894_hospital_records.pdf
│       └── 1234567895_xray.png
```

## 5. File Validation

The app automatically validates:
- ✅ **File types:** PDF, PNG, JPEG only
- ✅ **File size:** Maximum 10 MB
- ✅ **Unique naming:** Timestamp prefix prevents collisions

## 6. Security Notes

- 🔒 Bucket is **private** by default
- 🔒 Files are stored in submission-specific folders
- 🔒 Anon key is safe to expose in frontend (limited permissions)
- 🔒 Never commit `.env.local` to git (already in .gitignore)

## 7. Testing

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Visit: `http://localhost:3000/u/demo-token`

3. Enter any passcode (4+ characters)

4. Try uploading:
   - ✅ Valid: PDF, PNG, JPEG under 10MB
   - ❌ Invalid: Other formats or files over 10MB

5. Check Supabase Storage to verify files are uploaded correctly

## 8. Production Considerations

For production, you should:

1. **Implement proper token validation** - Replace mock token system with real database lookup
2. **Add database records** - Store upload metadata in `lead_documents` table
3. **Implement signed URLs** - For secure file access from internal portal
4. **Add webhook notifications** - Notify team when documents are uploaded
5. **Set up cleanup jobs** - Remove expired upload requests and orphaned files
