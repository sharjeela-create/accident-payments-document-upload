# Document Upload Database Schema

## Overview
This document outlines the database schema for tracking document uploads associated with leads in the Accident Payments system.

## Tables

### 1. `lead_document_requests`
Tracks document upload requests sent to customers.

```sql
CREATE TABLE lead_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT NOT NULL REFERENCES leads(submission_id) ON DELETE CASCADE,
  
  -- Security
  passcode_hash TEXT NOT NULL,  -- bcrypt hash of the passcode
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Requirements (which documents are required)
  police_report_required BOOLEAN DEFAULT false,
  insurance_document_required BOOLEAN DEFAULT false,
  medical_report_required BOOLEAN DEFAULT false,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Email tracking
  email_sent_at TIMESTAMPTZ,
  email_sent_to TEXT,
  
  UNIQUE(submission_id)  -- One active request per submission
);

-- Index for fast lookups
CREATE INDEX idx_lead_document_requests_submission_id ON lead_document_requests(submission_id);
CREATE INDEX idx_lead_document_requests_status ON lead_document_requests(status);
CREATE INDEX idx_lead_document_requests_expires_at ON lead_document_requests(expires_at);
```

### 2. `lead_documents`
Stores metadata about uploaded documents.

```sql
CREATE TABLE lead_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT NOT NULL REFERENCES leads(submission_id) ON DELETE CASCADE,
  request_id UUID REFERENCES lead_document_requests(id) ON DELETE SET NULL,
  
  -- Document info
  category TEXT NOT NULL CHECK (category IN ('police_report', 'insurance_document', 'medical_report')),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  
  -- Storage path in Supabase Storage
  storage_path TEXT NOT NULL,  -- e.g., "submission123/police_report/1234567890_report.pdf"
  bucket_name TEXT DEFAULT 'lead-documents',
  
  -- Metadata
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),  -- NULL if uploaded by customer
  
  -- Status
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'rejected', 'archived')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- Notes
  notes TEXT
);

-- Indexes
CREATE INDEX idx_lead_documents_submission_id ON lead_documents(submission_id);
CREATE INDEX idx_lead_documents_category ON lead_documents(category);
CREATE INDEX idx_lead_documents_request_id ON lead_documents(request_id);
CREATE INDEX idx_lead_documents_status ON lead_documents(status);
CREATE INDEX idx_lead_documents_uploaded_at ON lead_documents(uploaded_at DESC);
```

### 3. `lead_document_request_events`
Audit trail for document request lifecycle.

```sql
CREATE TABLE lead_document_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES lead_document_requests(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'request_created',
    'email_sent',
    'passcode_verified',
    'document_uploaded',
    'request_completed',
    'request_expired'
  )),
  
  event_data JSONB,  -- Additional event-specific data
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for event lookups
CREATE INDEX idx_lead_document_request_events_request_id ON lead_document_request_events(request_id);
CREATE INDEX idx_lead_document_request_events_created_at ON lead_document_request_events(created_at DESC);
```

## Modifications to Existing Tables

### `daily_deal_flow` - Add Document URL Fields

```sql
-- Add columns to store document URLs/paths
ALTER TABLE daily_deal_flow
ADD COLUMN police_report_url TEXT,
ADD COLUMN insurance_document_url TEXT,
ADD COLUMN medical_report_url TEXT,
ADD COLUMN documents_uploaded_at TIMESTAMPTZ,
ADD COLUMN documents_verified BOOLEAN DEFAULT false;

-- Add index for document tracking
CREATE INDEX idx_daily_deal_flow_documents_uploaded_at ON daily_deal_flow(documents_uploaded_at);
```

**Alternative Approach (Recommended):**
Instead of storing individual URLs, store a JSON array of document references:

```sql
ALTER TABLE daily_deal_flow
ADD COLUMN document_references JSONB DEFAULT '[]'::jsonb,
ADD COLUMN documents_last_updated TIMESTAMPTZ;

-- Example document_references structure:
-- [
--   {
--     "category": "police_report",
--     "document_id": "uuid",
--     "storage_path": "submission123/police_report/file.pdf",
--     "uploaded_at": "2026-03-11T02:00:00Z",
--     "verified": true
--   }
-- ]

-- Index for JSON queries
CREATE INDEX idx_daily_deal_flow_document_references ON daily_deal_flow USING GIN (document_references);
```

## RLS (Row Level Security) Policies

### `lead_document_requests`

```sql
-- Enable RLS
ALTER TABLE lead_document_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all requests
CREATE POLICY "Authenticated users can view document requests"
  ON lead_document_requests FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create requests
CREATE POLICY "Authenticated users can create document requests"
  ON lead_document_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update requests
CREATE POLICY "Authenticated users can update document requests"
  ON lead_document_requests FOR UPDATE
  TO authenticated
  USING (true);
```

### `lead_documents`

```sql
-- Enable RLS
ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all documents
CREATE POLICY "Authenticated users can view documents"
  ON lead_documents FOR SELECT
  TO authenticated
  USING (true);

-- Anyone can insert documents (for customer uploads via anon key)
CREATE POLICY "Anyone can upload documents"
  ON lead_documents FOR INSERT
  TO public
  WITH CHECK (true);

-- Authenticated users can update documents
CREATE POLICY "Authenticated users can update documents"
  ON lead_documents FOR UPDATE
  TO authenticated
  USING (true);
```

### `lead_document_request_events`

```sql
-- Enable RLS
ALTER TABLE lead_document_request_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all events
CREATE POLICY "Authenticated users can view events"
  ON lead_document_request_events FOR SELECT
  TO authenticated
  USING (true);

-- Anyone can insert events (for tracking customer actions)
CREATE POLICY "Anyone can insert events"
  ON lead_document_request_events FOR INSERT
  TO public
  WITH CHECK (true);
```

## Storage Bucket Configuration

**Bucket Name:** `lead-documents`

**Settings:**
- Public: No (private)
- File size limit: 10 MB
- Allowed MIME types: `application/pdf`, `image/png`, `image/jpeg`

**Folder Structure:**
```
lead-documents/
  {submission_id}/
    police_report/
      {timestamp}_{filename}
    insurance_document/
      {timestamp}_{filename}
    medical_report/
      {timestamp}_{filename}
```

## Workflow

### 1. Create Document Request (Closer Portal)
```sql
INSERT INTO lead_document_requests (
  submission_id,
  passcode_hash,
  expires_at,
  police_report_required,
  insurance_document_required,
  medical_report_required,
  created_by
) VALUES (
  'SUB123',
  '$2b$10$...',  -- bcrypt hash
  NOW() + INTERVAL '7 days',
  true,
  true,
  false,
  auth.uid()
);
```

### 2. Customer Uploads Document
```sql
-- Insert document record
INSERT INTO lead_documents (
  submission_id,
  request_id,
  category,
  file_name,
  file_size,
  file_type,
  storage_path
) VALUES (
  'SUB123',
  'request-uuid',
  'police_report',
  'accident_report.pdf',
  1024000,
  'application/pdf',
  'SUB123/police_report/1234567890_accident_report.pdf'
);

-- Log event
INSERT INTO lead_document_request_events (
  request_id,
  event_type,
  event_data
) VALUES (
  'request-uuid',
  'document_uploaded',
  '{"category": "police_report", "file_name": "accident_report.pdf"}'::jsonb
);
```

### 3. Update daily_deal_flow (Optional)
```sql
-- Update with latest document reference
UPDATE daily_deal_flow
SET document_references = document_references || 
  '[{
    "category": "police_report",
    "document_id": "doc-uuid",
    "storage_path": "SUB123/police_report/file.pdf",
    "uploaded_at": "2026-03-11T02:00:00Z",
    "verified": false
  }]'::jsonb,
  documents_last_updated = NOW()
WHERE submission_id = 'SUB123';
```

## Queries

### Get all documents for a submission
```sql
SELECT * FROM lead_documents
WHERE submission_id = 'SUB123'
ORDER BY uploaded_at DESC;
```

### Get document request status
```sql
SELECT 
  ldr.*,
  COUNT(ld.id) FILTER (WHERE ld.category = 'police_report') as police_report_count,
  COUNT(ld.id) FILTER (WHERE ld.category = 'insurance_document') as insurance_document_count,
  COUNT(ld.id) FILTER (WHERE ld.category = 'medical_report') as medical_report_count
FROM lead_document_requests ldr
LEFT JOIN lead_documents ld ON ld.request_id = ldr.id
WHERE ldr.submission_id = 'SUB123'
GROUP BY ldr.id;
```

### Check if all required documents are uploaded
```sql
SELECT 
  ldr.submission_id,
  ldr.police_report_required,
  ldr.insurance_document_required,
  ldr.medical_report_required,
  COUNT(ld.id) FILTER (WHERE ld.category = 'police_report') > 0 as has_police_report,
  COUNT(ld.id) FILTER (WHERE ld.category = 'insurance_document') > 0 as has_insurance_doc,
  COUNT(ld.id) FILTER (WHERE ld.category = 'medical_report') > 0 as has_medical_report,
  CASE 
    WHEN (ldr.police_report_required = false OR COUNT(ld.id) FILTER (WHERE ld.category = 'police_report') > 0)
     AND (ldr.insurance_document_required = false OR COUNT(ld.id) FILTER (WHERE ld.category = 'insurance_document') > 0)
     AND (ldr.medical_report_required = false OR COUNT(ld.id) FILTER (WHERE ld.category = 'medical_report') > 0)
    THEN true
    ELSE false
  END as all_required_uploaded
FROM lead_document_requests ldr
LEFT JOIN lead_documents ld ON ld.request_id = ldr.id
WHERE ldr.submission_id = 'SUB123'
GROUP BY ldr.id;
```
