// Step 8 / Step 9 尚未實作的頁面佔位
export default function ComingSoon({ step }: { step: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
      <p>此功能將於 {step} 加入。</p>
      <p className="mt-1">目前已完成登入、我的卡片與推薦詢問流程。</p>
    </div>
  );
}
