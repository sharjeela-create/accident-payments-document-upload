import * as React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";

import type { DocumentCategory, RequestStatus } from "@/lib/types";
import { getStatus, resolveRequest, uploadDocument, completeUpload, deleteDocument } from "@/lib/mockApi";
import { PageShell } from "@/components/layout/PageShell";
import { Header } from "@/components/brand/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CategoryCard } from "@/components/upload/CategoryCard";

const categories: DocumentCategory[] = [
  "police_report",
  "insurance_document",
  "medical_report",
];

const categoryLabel: Record<DocumentCategory, string> = {
  police_report: "Police Report",
  insurance_document: "Insurance Document",
  medical_report: "Medical Reports",
};

function requiredIsSatisfied(status: RequestStatus, category: DocumentCategory) {
  const required = Boolean(status.requirements?.[category]);
  if (!required) return true;
  return (status.uploaded?.[category]?.length ?? 0) > 0;
}

function allRequiredSatisfied(status: RequestStatus) {
  return categories.every((c) => requiredIsSatisfied(status, c));
}

export default function UploadPage() {
  const router = useRouter();
  const submissionId = typeof router.query.submissionId === "string" ? router.query.submissionId : "";

  const [passcode, setPasscode] = React.useState("");
  const [unlocking, setUnlocking] = React.useState(false);
  const [unlockError, setUnlockError] = React.useState<string | null>(null);

  const [status, setStatus] = React.useState<RequestStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(false);

  const [uploadingCategory, setUploadingCategory] = React.useState<DocumentCategory | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<Record<DocumentCategory, number>>({
    police_report: 0,
    insurance_document: 0,
    medical_report: 0,
  });
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!submissionId) return;
    setLoadingStatus(true);
    try {
      const next = await getStatus(submissionId);
      setStatus(next);
    } finally {
      setLoadingStatus(false);
    }
  }, [submissionId]);

  const onUnlock = async () => {
    setUnlockError(null);
    setUnlocking(true);
    try {
      const next = await resolveRequest({ submissionId, passcode });
      setStatus(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to unlock. Please try again.";
      setUnlockError(msg);
    } finally {
      setUnlocking(false);
    }
  };

  const onUpload = async (category: DocumentCategory, file: File) => {
    if (!submissionId) return;
    setUploadingCategory(category);
    setUploadProgress((p) => ({ ...p, [category]: 0 }));

    try {
      await uploadDocument({
        submissionId,
        category,
        file,
        onProgress: (pct) => setUploadProgress((p) => ({ ...p, [category]: pct })),
      });
      await refresh();
    } catch (e) {
      // For UI-first: keep errors minimal and non-technical
      const msg = e instanceof Error ? e.message : "Upload failed. Please try again.";
      setUnlockError(msg);
    } finally {
      setUploadingCategory(null);
    }
  };

  const unlocked = Boolean(status);
  const allDocsUploaded = status ? allRequiredSatisfied(status) : false;

  const handleDone = async () => {
    if (!submissionId || !allDocsUploaded) return;
    
    setIsCompleting(true);
    try {
      await completeUpload(submissionId);
      setIsCompleted(true);
    } catch (error) {
      console.error('Error completing upload:', error);
      setUnlockError('Failed to complete upload. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = async (category: DocumentCategory, documentId: string) => {
    try {
      await deleteDocument({ submissionId, category, documentId });
      await refresh();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  return (
    <>
      <Head>
        <title>Accident Payments | Secure Document Upload</title>
      </Head>

      <PageShell>
        <div className="space-y-6 sm:space-y-8">
          <Header 
            showDoneButton={unlocked && allDocsUploaded && !isCompleted}
            onDone={handleDone}
            isDoneLoading={isCompleting}
          />

          {isCompleted ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="rounded-full bg-green-100 p-4">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Upload Complete!</h2>
                    <p className="mt-2 text-zinc-600">
                      Thank you for uploading your documents. This portal is now locked.
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      You can safely close this page.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-6 lg:gap-8 xl:grid-cols-[440px_1fr]">
            <div className="space-y-4 sm:space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-700" />
                    Unlock this upload page
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-zinc-600">
                    Enter the passcode you received by email or text. This helps protect your documents.
                  </div>

                  <Input
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter passcode"
                    autoComplete="one-time-code"
                    inputMode="text"
                    error={unlockError}
                  />

                  <div className="flex items-center gap-2">
                    <Button
                      className="w-full"
                      isLoading={unlocking}
                      onClick={onUnlock}
                      disabled={!submissionId || passcode.trim().length < 4}
                    >
                      Unlock
                    </Button>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-zinc-900 p-2 text-white">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-900">Security tip</div>
                        <div className="mt-1 text-sm text-zinc-600">
                          Only upload documents you’re comfortable sharing. If you believe this link was sent in error,
                          close this page.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {unlocked ? (
                <Alert variant={allRequiredSatisfied(status!) ? "success" : "info"}>
                  <div className="flex items-start gap-3">
                    {allRequiredSatisfied(status!) ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                    ) : (
                      <ShieldCheck className="mt-0.5 h-4 w-4" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {allRequiredSatisfied(status!)
                          ? "All required documents have been received."
                          : "You can upload documents below."}
                      </div>
                      <div className="mt-1 text-sm opacity-90">
                        You can upload multiple files per category. If you don’t have a file right now, you can return
                        to this link later.
                      </div>
                    </div>
                  </div>
                </Alert>
              ) : null}

              {!submissionId ? (
                <Alert variant="warning" title="Invalid link">
                  This upload link is missing a submission ID. Please open the exact link that was sent to you.
                </Alert>
              ) : null}
            </div>

            <div className="space-y-4 sm:space-y-5">
              <Card>
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle>Documents</CardTitle>
                    <div className="mt-1 text-sm text-zinc-500">
                      Upload the requested documents. Large files may take a minute.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unlocked ? (
                      <Badge variant={allRequiredSatisfied(status!) ? "success" : "outline"}>
                        {allRequiredSatisfied(status!) ? "Complete" : "In progress"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Locked</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!unlocked ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-white p-8 sm:p-10 text-center">
                      <TriangleAlert className="h-6 w-6 text-zinc-400" />
                      <div className="text-sm font-semibold text-zinc-900">This page is locked</div>
                      <div className="text-sm text-zinc-500">
                        Enter your passcode <span className="hidden xl:inline">on the left</span><span className="xl:hidden">above</span> to view upload options.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5 sm:space-y-6">
                      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        {categories.map((category) => (
                          <CategoryCard
                            key={category}
                            category={category}
                            required={Boolean(status!.requirements?.[category])}
                            docs={status!.uploaded?.[category] ?? []}
                            onUpload={(file) => onUpload(category, file)}
                            onDelete={(documentId) => handleDelete(category, documentId)}
                            isUploading={uploadingCategory === category}
                            uploadProgress={uploadProgress[category] ?? 0}
                          />
                        ))}
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="text-sm font-semibold text-zinc-900">What happens next?</div>
                        <div className="mt-1 text-sm text-zinc-600">
                          After you upload, our team will review your documents and connect them to your case.
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {categories
                            .filter((c) => Boolean(status!.requirements?.[c]))
                            .map((c) => (
                              <div
                                key={c}
                                className="flex items-center justify-between rounded-lg border border-zinc-200/70 bg-white px-3 py-2"
                              >
                                <div className="text-sm text-zinc-700">{categoryLabel[c]}</div>
                                {requiredIsSatisfied(status!, c) ? (
                                  <Badge variant="success">Received</Badge>
                                ) : (
                                  <Badge variant="warning">Needed</Badge>
                                )}
                              </div>
                            ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-xs text-zinc-500">
                            {loadingStatus ? "Refreshing…" : ""}
                          </div>
                          <Button variant="ghost" onClick={refresh} disabled={loadingStatus}>
                            Refresh
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="text-xs text-zinc-500">
                If you have trouble uploading, try a different file format (PDF/JPG) or a smaller file.
              </div>
            </div>
          </div>
          )}
        </div>
      </PageShell>
    </>
  );
}
