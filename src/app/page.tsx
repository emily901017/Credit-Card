import { redirect } from "next/navigation";

// 根目錄一律導向主功能頁；middleware 會在未登入時再轉去 /login。
export default function Home() {
  redirect("/ask");
}
