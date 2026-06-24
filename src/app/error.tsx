"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold">發生錯誤</p>
      <p className="text-sm text-gray-500">
        {error.message || "請稍後再試一次。"}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white"
      >
        重試
      </button>
    </div>
  );
}
