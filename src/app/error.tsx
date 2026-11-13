"use client";

export default function Error({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-muted">An unexpected error occurred. Please try again.</p>
      <button onClick={() => unstable_retry()} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
