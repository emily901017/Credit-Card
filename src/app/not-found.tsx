import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold">找不到頁面</p>
      <Link
        href="/ask"
        className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white"
      >
        回到首頁
      </Link>
    </div>
  );
}
