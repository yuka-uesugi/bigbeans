export default function Footer() {
  return (
    <footer className="py-12 px-6 bg-ag-gray-900 text-ag-gray-400">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* ロゴ */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ag-lime-500/20 flex items-center justify-center">
              <span className="text-xl">🏸</span>
            </div>
            <div>
              <span className="font-bold text-white text-lg">
                ALL-IN-ONE
              </span>
              <p className="text-xs text-ag-gray-500">
                バドミントンチーム運営OS
              </p>
            </div>
          </div>

          {/* リンク */}
          <div className="flex gap-6 text-sm">
            <a
              href="#features"
              className="hover:text-ag-lime-400 transition-colors"
            >
              機能一覧
            </a>
            <a href="#" className="hover:text-ag-lime-400 transition-colors">
              利用規約
            </a>
            <a href="#" className="hover:text-ag-lime-400 transition-colors">
              お問い合わせ
            </a>
          </div>

          {/* コピーライト */}
          <div className="text-sm font-semibold tracking-wide text-gray-400">
            © 2026 ALL-IN-ONE. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
