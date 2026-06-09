"use client";

import { useState } from "react";

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
    <section className="relative py-20 px-6 bg-gradient-to-b from-white to-ag-lime-50/40">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-[2.5rem] border-2 border-ag-lime-200 shadow-xl overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-ag-lime-500 to-ag-lime-600 text-white">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">
              お問い合わせ・見学のご相談
            </h2>
            <p className="text-sm font-bold text-white/80 mt-2">
              はじめての方も、お気軽にどうぞ。
            </p>
          </div>

          <div className="p-8 sm:p-10 space-y-6">
            <p className="text-base sm:text-lg font-bold text-ag-gray-700 leading-relaxed">
              ビッグビーンズへの見学・体験参加・入会についてのご質問は、下記メールアドレスまでお気軽にご連絡ください。
              <br />
              代表より2〜3日以内にお返事いたします。
            </p>

            <div className="bg-ag-lime-50 rounded-2xl border-2 border-ag-lime-200 p-6 space-y-4">
              <div>
                <p className="text-xs font-black text-ag-lime-700 uppercase tracking-widest mb-2">
                  Email
                </p>
                <p className="text-xl sm:text-2xl font-black text-ag-gray-900 break-all select-all">
                  {CONTACT_EMAIL}
                </p>
              </div>

              {/* 3つの送信方法 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-ag-lime-50 border-2 border-ag-lime-300 rounded-xl text-sm font-black text-ag-gray-800 transition-colors"
                >
                  Gmailで開く
                </a>
                <a
                  href={mailtoUrl}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-ag-lime-50 border-2 border-ag-lime-300 rounded-xl text-sm font-black text-ag-gray-800 transition-colors"
                >
                  メールアプリで開く
                </a>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-ag-lime-500 hover:bg-ag-lime-600 text-white rounded-xl text-sm font-black transition-colors"
                >
                  {copied ? "コピー済" : "アドレスをコピー"}
                </button>
              </div>

              <p className="text-xs font-bold text-ag-gray-500 leading-relaxed">
                ※ お使いの環境にあった方法をお選びください。Gmailアカウントをお持ちでない場合は「コピー」または「メールアプリで開く」をご利用ください。
              </p>
            </div>

            <div className="bg-ag-gray-50 rounded-2xl border border-ag-gray-100 p-5">
              <p className="text-sm font-black text-ag-gray-700 mb-2">よくあるご質問</p>
              <ul className="text-sm font-bold text-ag-gray-600 space-y-1.5 leading-relaxed">
                <li>・見学だけでも参加できますか？ → もちろん大歓迎です</li>
                <li>・初心者でも大丈夫ですか？ → ブランクのある方・初心者の方も多く在籍</li>
                <li>・体験料金は？ → ビジター料金（¥900〜¥1,300）でご参加いただけます</li>
              </ul>
            </div>

            <div className="bg-sky-50 rounded-2xl border border-sky-200 p-5">
              <p className="text-sm font-black text-sky-900 mb-2">練習スケジュールをGoogleカレンダーで購読</p>
              <p className="text-xs font-bold text-sky-700 leading-relaxed mb-3">
                練習・試合・イベントの予定がご自身のGoogleカレンダーに自動同期されます。
              </p>
              <a
                href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl?url=https%3A%2F%2Fbigbeans.vercel.app%2Fapi%2Fcalendar.ics"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-black transition-colors"
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
