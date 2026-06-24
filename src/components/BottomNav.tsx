"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 對應 SDD 15.1：底部導覽列
const TABS = [
  { href: "/ask", label: "詢問", icon: "💳" },
  { href: "/pending", label: "待確認", icon: "⏳" },
  { href: "/reward-pools", label: "額度", icon: "📊" },
  { href: "/transactions", label: "交易", icon: "🧾" },
  { href: "/cards", label: "我的卡", icon: "🪪" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
                active ? "font-semibold text-black" : "text-gray-400"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
