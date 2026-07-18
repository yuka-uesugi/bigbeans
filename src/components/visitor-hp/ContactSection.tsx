"use client";

import { useState } from "react";
import { archivo } from "./fonts";

const CONTACT_EMAIL = "bigbeans.tsuduki@gmail.com";
const SUBJECT = "Big Beans 見学・体験のお問い合わせ";

export default function ContactSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("以下のメールアドレスをコピーしてください", CONTACT_EMAIL);
    }
  };

  const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent(SUBJECT)}`;

  return (
    <section className="bb-light relative py-20 sm:py-28 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className={`${archivo.className} text-xs sm:text-sm font-bold text-[#2c55a8] tracking-[0.35em] mb-3`}>
            CONTACT
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#16294d] tracking-tight">
            お問い合わせ・見学のご相談
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* 上端のカラーバー */}
          <div className="h-1.5 bg-gradient-to-r from-[#2c55a8] via-[#5d8f1f] to-[#ffd826]" />

          <div className="p-8 sm:p-10 space-y-6">
            <p className="text-base sm:text-lg font-bold text-slate-700 leading-relaxed">
              ビッグビーンズへの見学・体験参加・入会についてのご質問は、下記メールアドレスまでお気軽にご連絡ください。
              <br />
              代表より2〜3日以内にお返事いたします。
            </p>

            <div className="bg-[#eef2fa] rounded-xl border border-[#ccd9f0] p-6 space-y-4">
              <div>
                <p className="text-sm font-black text-[#2c55a8] mb-2">
                  メールアドレス
                </p>
                <p className="text-xl sm:text-2xl font-black text-[#16294d] break-all select-all">
                  {CONTACT_EMAIL}
                </p>
              </div>

              {/* 3つの送信方法 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-[#16294d] rounded-full text-sm font-black text-[#16294d] hover:bg-[#f4f6fb] transition-colors"
                >
                  Gmailで開く
                </a>
                <a
                  href={mailtoUrl}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-[#16294d] rounded-full text-sm font-black text-[#16294d] hover:bg-[#f4f6fb] transition-colors"
                >
                  メールアプリで開く
                </a>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#ffd826] hover:bg-[#f2ca0e] text-[#16294d] rounded-full text-sm font-black transition-colors cursor-pointer"
                >
                  {copied ? "コピー済" : "アドレスをコピー"}
                </button>
              </div>

              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                ※ お使いの環境にあった方法をお選びください。Gmailアカウントをお持ちでない場合は「コピー」または「メールアプリで開く」をご利用ください。
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#fdf2e9] to-[#fce8f3] rounded-xl border border-[#f0d9c8] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-base font-black text-[#16294d] mb-1">Instagramもやっています</p>
                <p className="text-sm font-bold text-slate-600">
                  練習の様子や大会の報告などを発信中です
                </p>
              </div>
              <a
                href="https://www.instagram.com/bigbeans_badmintonteam/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white rounded-full text-sm font-black shadow-md hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
                </svg>
                Instagramを見る
              </a>
            </div>

            <div className="bg-[#f6f8fc] rounded-xl border border-[#dfe6f5] p-5">
              <p className="text-base font-black text-[#16294d] mb-2">活動エリア・練習会場</p>
              <p className="text-sm sm:text-base font-bold text-slate-600 leading-relaxed">
                横浜市都筑区を中心に、緑区・青葉区の施設でも活動しています。
                詳しい練習会場は、見学・体験のお申し込みの際にご案内します。
              </p>
            </div>

            <div className="bg-[#f6f8fc] rounded-xl border border-[#dfe6f5] p-5">
              <p className="text-base font-black text-[#16294d] mb-2">よくあるご質問</p>
              <ul className="text-sm sm:text-base font-bold text-slate-600 space-y-1.5 leading-relaxed">
                <li>・見学だけでも参加できますか？ → もちろん大歓迎です</li>
                <li>・初級者でも大丈夫ですか？ → ブランクのある方・初級者の方も多く在籍</li>
                <li>
                  ・上級者でも楽しめますか？ → 全日本レディース出場チームです。現役県代表コーチの
                  本格的な練習で、上級者の方も歓迎です
                </li>
                <li>
                  ・全くの未経験でも参加できますか？ →
                  まずはバドミントン教室で基礎を身につけてからのご参加をおすすめしています
                </li>
                <li>・体験料金は？ → ビジター料金（¥900〜¥1,300）でご参加いただけます</li>
                <li>・年齢層は？ → 20代〜60代まで幅広く、40代・50代・60代の方も多く活躍中です</li>
              </ul>
            </div>

            <div className="bg-[#f2f7e6] rounded-xl border border-[#cfe0a8] p-5">
              <p className="text-base font-black text-[#16294d] mb-2">練習スケジュールをGoogleカレンダーで購読</p>
              <p className="text-sm font-bold text-slate-600 leading-relaxed mb-3">
                練習・試合・イベントの予定がご自身のGoogleカレンダーに自動同期されます。
              </p>
              <a
                href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl?url=https%3A%2F%2Fbigbeans.vercel.app%2Fapi%2Fcalendar.ics"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5d8f1f] hover:bg-[#4e7817] text-white rounded-full text-sm font-black transition-colors"
              >
                Googleカレンダーで開く
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
