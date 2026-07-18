export default function Footer() {
  return (
    <footer className="py-12 px-6 bg-[#0f1c38] text-[#8ea1cc]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* ロゴ */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src="/LogoColor.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-white text-lg">
                ALL-IN-ONE
              </span>
              <p className="text-xs text-[#6d84ba]">
                バドミントンチーム運営OS
              </p>
            </div>
          </div>

          {/* リンク */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a
              href="#features"
              className="hover:text-[#ffd826] transition-colors"
            >
              機能一覧
            </a>
            <a
              href="https://www.instagram.com/bigbeans_badmintonteam/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#ffd826] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
              </svg>
              Instagram
            </a>
          </div>

          {/* 問い合わせ先 */}
          <div className="text-center md:text-right">
            <p className="text-xs font-bold text-[#6d84ba] mb-1">見学・体験のお問い合わせ</p>
            <p className="text-sm font-black text-[#ffd826] break-all select-all">
              bigbeans.tsuduki@gmail.com
            </p>
            <div className="flex flex-wrap justify-center md:justify-end gap-2 mt-2">
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=bigbeans.tsuduki%40gmail.com&su=Big%20Beans%20%E3%81%B8%E3%81%AE%E3%81%8A%E5%95%8F%E3%81%84%E5%90%88%E3%82%8F%E3%81%9B"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-[#1a2c52] hover:bg-[#22376a] border border-[#2c447c] rounded-lg text-xs font-black text-[#c3cfec] transition-colors"
              >
                Gmailで開く
              </a>
              <a
                href="mailto:bigbeans.tsuduki@gmail.com?subject=Big%20Beans%20%E3%81%B8%E3%81%AE%E3%81%8A%E5%95%8F%E3%81%84%E5%90%88%E3%82%8F%E3%81%9B"
                className="px-3 py-1 bg-[#1a2c52] hover:bg-[#22376a] border border-[#2c447c] rounded-lg text-xs font-black text-[#c3cfec] transition-colors"
              >
                メールアプリで開く
              </a>
            </div>
          </div>
        </div>

        {/* コピーライト */}
        <div className="mt-8 pt-6 border-t border-[#1e3059] text-center text-xs font-semibold tracking-wide text-[#6d84ba]">
          © 2026 Big Beans. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
