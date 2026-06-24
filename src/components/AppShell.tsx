import BottomNav from "./BottomNav";
import SignOutButton from "./SignOutButton";

// 已登入頁面的共用外殼：頂部標題 + 內容 + 底部導覽
export default function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">{title}</h1>
        <SignOutButton />
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
