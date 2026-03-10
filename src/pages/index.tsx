import * as React from "react";
import Head from "next/head";
import Link from "next/link";

import { PageShell } from "@/components/layout/PageShell";
import { Header } from "@/components/brand/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <Head>
        <title>Accident Payments | Secure Document Upload</title>
      </Head>

      <PageShell>
        <div className="space-y-6">
          <Header />

          <Card>
            <CardHeader>
              <CardTitle>Secure Document Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-600">
                Please open the secure upload link that was sent to you. If you do not have a link, contact the person
                assisting you.
              </p>

              <Link
                href="/upload-document/DEMO123"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--ap-accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ap-accent-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--ap-accent)] focus:ring-offset-2"
              >
                Try Demo Upload
              </Link>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-sm font-medium text-zinc-900">For testing</div>
                <div className="mt-1 text-sm text-zinc-600">
                  Developers can use a sample token route:
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <code className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-800">
                    /u/demo-token
                  </code>
                  <Link href="/u/demo-token" passHref legacyBehavior>
                    <a>
                      <Button variant="secondary">Open demo</Button>
                    </a>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-zinc-500">
            This page is intended for customers who received a secure upload link.
          </div>
        </div>
      </PageShell>
    </>
  );
}
