/**
 * 無障礙 Skip Link：鍵盤使用者按 Tab 即可跳過導航至主內容
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[9999] focus:rounded-md focus:bg-amber-500 focus:px-6 focus:py-3 focus:text-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0c0a10]"
    >
      跳至主內容
    </a>
  );
}
