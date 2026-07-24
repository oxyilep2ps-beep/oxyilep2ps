'use client';

import { useEffect } from 'react';

export default function ChatRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('🚨 CHAT ROOM SERVER CRASH:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-transparent p-6 text-center">
      <h2 className="text-2xl font-bold text-red-500">Something went wrong loading this chat</h2>
      <p className="mt-3 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        {error.message || 'A server error occurred.'}
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-neutral-500">Digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
      >
        Try Again
      </button>
    </div>
  );
}
