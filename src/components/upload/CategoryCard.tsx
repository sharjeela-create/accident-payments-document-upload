import * as React from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { FileText, UploadCloud, AlertCircle, Trash2 } from "lucide-react";

import type { DocumentCategory, UploadedDoc } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const labels: Record<DocumentCategory, string> = {
  police_report: "Police Report",
  insurance_document: "Insurance Document",
  medical_report: "Medical Reports",
};

const hints: Record<DocumentCategory, string> = {
  police_report: "PDF or photo of the full report (all pages).",
  insurance_document: "Policy, claim paperwork, or adjuster letter.",
  medical_report: "Discharge summary, visit notes, or billing statements.",
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, idx);
  return `${val.toFixed(val >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

export function CategoryCard({
  category,
  required,
  docs,
  onUpload,
  onDelete,
  isUploading,
  uploadProgress,
}: {
  category: DocumentCategory;
  required: boolean;
  docs: UploadedDoc[];
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  isUploading: boolean;
  uploadProgress: number;
}) {
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [documentToDelete, setDocumentToDelete] = React.useState<UploadedDoc | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const onDrop = React.useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setValidationError(null);
      
      if (rejected.length > 0) {
        const rejection = rejected[0];
        if (rejection.errors?.[0]?.code === 'file-too-large') {
          setValidationError('File is too large. Maximum size is 10 MB.');
        } else if (rejection.errors?.[0]?.code === 'file-invalid-type') {
          setValidationError('Invalid file type. Only PDF, PNG, and JPEG files are allowed.');
        } else {
          setValidationError('File validation failed. Please try another file.');
        }
        return;
      }

      const file = accepted?.[0];
      if (!file) return;
      onUpload(file);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    accept: ACCEPTED_FILE_TYPES,
  });

  const hasDocs = docs.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span className="truncate">{labels[category]}</span>
            {required ? <Badge variant="warning">Required</Badge> : <Badge variant="outline">Optional</Badge>}
          </CardTitle>
          <div className="mt-1 text-sm text-zinc-500">{hints[category]}</div>
        </div>
        <div className="flex items-center gap-2 self-start">
          {hasDocs ? <Badge variant="success">Received</Badge> : <Badge variant="outline">Not received</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-5">
        <div
          {...getRootProps()}
          className={cn(
            "rounded-xl border border-dashed p-4 transition-colors",
            isDragActive ? "border-[var(--ap-accent)] bg-[var(--ap-accent-soft)]" : "border-zinc-200 bg-white",
            isUploading ? "opacity-70" : ""
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                isDragActive ? "border-[var(--ap-accent-border)] bg-[var(--ap-accent-soft)] text-[var(--ap-accent)]" : "border-zinc-200 bg-zinc-50 text-zinc-700"
              )}>
                {isUploading ? <UploadCloud className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-900">
                  {isDragActive ? "Drop the file to upload" : "Drag & drop your file here"}
                </div>
                <div className="text-sm text-zinc-500">
                  Or use the upload button. One file at a time.
                </div>
              </div>
            </div>

            <Button
              variant={hasDocs ? "secondary" : "primary"}
              onClick={open}
              disabled={isUploading}
              className="w-full sm:w-auto shrink-0"
            >
              {hasDocs ? "Upload another" : "Upload file"}
            </Button>
          </div>

          {isUploading ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          ) : null}

          {validationError ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-red-900">Upload failed</div>
                <div className="text-sm text-red-700">{validationError}</div>
              </div>
            </div>
          ) : null}
        </div>

        {docs.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-500">Uploaded files</div>
            <div className="space-y-2">
              {docs.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200/70 bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-900">{doc.fileName}</div>
                    <div className="text-xs text-zinc-500">{formatBytes(doc.fileSize)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">Saved</Badge>
                    <button
                      onClick={() => {
                        setDocumentToDelete(doc);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {docs.length > 3 ? (
              <div className="text-xs text-zinc-500">+{docs.length - 3} more</div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {documentToDelete && (
            <div className="px-6 py-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-sm font-medium text-zinc-900">{documentToDelete.fileName}</div>
                <div className="text-xs text-zinc-500">{formatBytes(documentToDelete.fileSize)}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDocumentToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!documentToDelete || !onDelete) return;
                setIsDeleting(true);
                try {
                  await onDelete(documentToDelete.id);
                  setDeleteDialogOpen(false);
                  setDocumentToDelete(null);
                } catch (error) {
                  console.error('Delete failed:', error);
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
