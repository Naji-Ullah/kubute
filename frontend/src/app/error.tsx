"use client";

import { Button } from "@/components/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ retry }: ErrorPageProps) {
  return (
    <div className="mx-auto w-full max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">This page couldn’t load. It may be a temporary problem.</p>
      <Button type="button" className="mt-8" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
