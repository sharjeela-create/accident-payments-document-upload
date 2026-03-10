# Document Upload Integration Guide

## ✅ What's Been Completed

### 1. Database Schema ✅
- Created comprehensive SQL migration: `20260311000000_create_document_upload_tables.sql`
- Tables created:
  - `lead_document_requests` - Tracks upload requests with passcode and requirements
  - `lead_documents` - Stores document metadata and storage paths
  - `lead_document_request_events` - Audit trail for document lifecycle
- Modified `daily_deal_flow` table to add `document_references` JSONB field
- Added RLS policies for secure access
- Created helper functions for status tracking

### 2. Upload Portal Route Changes ✅
- Changed route from `/u/[token]` to `/upload-document/[submissionId]`
- Updated all references to use `submissionId` instead of `token`
- File validation: PDF, PNG, JPEG only, max 10MB
- Supabase Storage integration complete

### 3. Closer Portal Components ✅
- **DocumentUploadCard.tsx** - Card component for call update page
  - Shows document upload status
  - Creates upload requests with auto-generated passcode
  - Displays required vs uploaded documents
  - Refresh functionality
- **DocumentUploadModal.tsx** - Modal to display URL and passcode
  - Copy-to-clipboard for URL and passcode
  - Customer instructions
  - Open link in new tab

## 🔧 Next Steps (What You Need to Do)

### Step 1: Run the Migration
```bash
cd Crash-Guard-Agent-Portal
# Apply the migration to your Supabase project
# You can do this via Supabase Dashboard > SQL Editor
# Or use the Supabase CLI if configured
```

Copy the contents of:
`Crash-Guard-Agent-Portal/supabase/migrations/20260311000000_create_document_upload_tables.sql`

And run it in your Supabase SQL Editor.

### Step 2: Regenerate TypeScript Types
After running the migration, regenerate the Supabase types:

```bash
cd Crash-Guard-Agent-Portal
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

Or use the Supabase dashboard to generate types.

### Step 3: Create Supabase Storage Bucket
In Supabase Dashboard:
1. Go to Storage
2. Create new bucket: `lead-documents`
3. Settings:
   - Public: **No** (private)
   - File size limit: **10 MB**
   - Allowed MIME types: `application/pdf`, `image/png`, `image/jpeg`

### Step 4: Set Environment Variables

**In Crash-Guard-Agent-Portal (.env.local):**
```env
NEXT_PUBLIC_UPLOAD_PORTAL_URL=http://localhost:3001
```

**In accident-payments-document-upload (.env.local):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 5: Integrate DocumentUploadCard into CallResultUpdate Page

Add this import to `CallResultUpdate.tsx`:
```typescript
import { DocumentUploadCard } from "@/components/DocumentUploadCard";
```

Add the card in the appropriate location (suggested: in the left column with other cards):

```typescript
{/* Around line 465, in the left column */}
<div className="space-y-6">
  <DocumentUploadCard submissionId={submissionId!} />
  
  <Card>
    <CardHeader>
      <CardTitle>Send Contract</CardTitle>
    </CardHeader>
    {/* ... existing contract card ... */}
  </Card>
  
  {/* ... rest of cards ... */}
</div>
```

### Step 6: Start Both Applications

**Terminal 1 - Upload Portal:**
```bash
cd accident-payments-document-upload
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 - Closer Portal:**
```bash
cd Crash-Guard-Agent-Portal
npm run dev
# Runs on http://localhost:3000
```

## 📋 Testing Workflow

### 1. Create Upload Request (Closer Portal)
1. Navigate to call update page: `/call-result-update?submissionId=TEST123`
2. Find the "Document Upload" card
3. Click "Create Upload Link"
4. Modal opens showing:
   - Upload URL: `http://localhost:3001/upload-document/TEST123`
   - Passcode: (8-character auto-generated code)
5. Copy URL and passcode

### 2. Customer Upload (Upload Portal)
1. Open the URL in a new tab/browser
2. Enter the passcode
3. Upload documents (PDF, PNG, or JPEG under 10MB)
4. Verify upload success

### 3. Verify in Closer Portal
1. Go back to call update page
2. Click "Refresh" on Document Upload card
3. See uploaded documents marked with checkmarks
4. Status changes to "Completed" when all required docs uploaded

## 🗂️ File Structure

```
accident-payments-document-upload/
├── src/
│   ├── pages/
│   │   ├── index.tsx (landing page)
│   │   └── upload-document/
│   │       └── [submissionId].tsx (main upload page)
│   ├── components/
│   │   ├── upload/
│   │   │   └── CategoryCard.tsx (file upload with validation)
│   │   ├── ui/ (Button, Card, Input, Badge, etc.)
│   │   ├── brand/
│   │   │   └── Header.tsx
│   │   └── layout/
│   │       └── PageShell.tsx
│   └── lib/
│       ├── supabase.ts (Supabase client & upload functions)
│       ├── mockApi.ts (API functions)
│       └── types.ts
├── .env.local (Supabase credentials)
└── DATABASE_SCHEMA.md

Crash-Guard-Agent-Portal/
├── src/
│   ├── components/
│   │   ├── DocumentUploadCard.tsx (NEW)
│   │   └── DocumentUploadModal.tsx (NEW)
│   └── pages/
│       └── CallResultUpdate.tsx (needs integration)
├── supabase/
│   └── migrations/
│       └── 20260311000000_create_document_upload_tables.sql (NEW)
└── .env.local (add NEXT_PUBLIC_UPLOAD_PORTAL_URL)
```

## 🔐 Security Features

1. **Passcode Protection**: 8-character random passcode (excluding ambiguous chars)
2. **Expiration**: Upload links expire after 7 days
3. **File Validation**: Only PDF, PNG, JPEG allowed, max 10MB
4. **Private Storage**: Documents stored in private Supabase bucket
5. **RLS Policies**: Row-level security on all tables
6. **Audit Trail**: All events logged in `lead_document_request_events`

## 📊 Database Queries

### Check Upload Status
```sql
SELECT 
  ldr.*,
  COUNT(ld.id) FILTER (WHERE ld.category = 'police_report') as police_report_count,
  COUNT(ld.id) FILTER (WHERE ld.category = 'insurance_document') as insurance_doc_count,
  COUNT(ld.id) FILTER (WHERE ld.category = 'medical_report') as medical_report_count
FROM lead_document_requests ldr
LEFT JOIN lead_documents ld ON ld.request_id = ldr.id
WHERE ldr.submission_id = 'YOUR_SUBMISSION_ID'
GROUP BY ldr.id;
```

### View All Documents for a Lead
```sql
SELECT * FROM lead_documents
WHERE submission_id = 'YOUR_SUBMISSION_ID'
ORDER BY uploaded_at DESC;
```

### View Upload Events
```sql
SELECT * FROM lead_document_request_events
WHERE request_id = 'YOUR_REQUEST_ID'
ORDER BY created_at DESC;
```

## 🚨 Important Notes

1. **Passcode Storage**: Currently using SHA-256 hash for demo. In production, implement bcrypt hashing via Edge Function.

2. **Passcode Retrieval**: The passcode is only shown once when created. If lost, you'll need to create a new upload request.

3. **Port Configuration**: Upload portal runs on port 3001 by default. Update `NEXT_PUBLIC_UPLOAD_PORTAL_URL` if different.

4. **Production Deployment**: 
   - Deploy upload portal separately (e.g., Vercel, Netlify)
   - Update `NEXT_PUBLIC_UPLOAD_PORTAL_URL` to production URL
   - Implement email sending via Mailgun Edge Function
   - Use proper bcrypt hashing for passcodes

## 🔄 Future Enhancements

1. **Email Integration**: Auto-send upload link + passcode via Mailgun
2. **Document Verification**: Internal portal UI to verify/reject uploaded docs
3. **Notifications**: Real-time notifications when documents are uploaded
4. **Document Preview**: View uploaded documents in closer portal
5. **Bulk Operations**: Create upload requests for multiple leads at once
6. **Custom Requirements**: Allow customizing which documents are required per lead
7. **Signed URLs**: Generate time-limited signed URLs for secure document access

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase credentials in `.env.local`
3. Ensure migration was run successfully
4. Check Supabase Storage bucket exists and has correct permissions
5. Verify both apps are running on correct ports
