export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
        <p className="text-sm">載入中…</p>
      </div>
    </div>
  );
}
