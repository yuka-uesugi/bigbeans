"use client";

import { useState, Suspense } from "react";

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState("fees");

  const tabs = [
    { id: "fees", name: "費用・登録規定", icon: "💰" },
    { id: "facilities", name: "練習場所・運用", icon: "🏢" },
    { id: "organization", name: "役員・組織分担", icon: "👥" },
    { id: "matches", name: "試合・連盟・保険", icon: "🏆" },
    { id: "transport", name: "車代・精算基準", icon: "🚗" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up pb-32">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            チーム規約・運営情報
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1 italic">
            最終更新: 2026年1月21日（コーチ契約・シャトル実績等確認済）
          </p>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex border-b border-ag-gray-200 gap-6 overflow-x-auto custom-scrollbar pt-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id 
                ? 'text-ag-lime-600 border-ag-lime-500' 
                : 'text-ag-gray-400 border-transparent hover:text-ag-gray-600'
            }`}
          >
            <span>{tab.icon}</span> {tab.name}
          </button>
        ))}
      </div>

      {/* コンテンツエリア */}
      <div className="mt-6">
        {/* I & II. 費用・登録規定 */}
        {activeTab === "fees" && (
          <div className="space-y-8 animate-fade-in">
            {/* 練習費用比較表 */}
            <div className="bg-white rounded-2xl border border-ag-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-ag-lime-50 to-white border-b border-ag-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-ag-gray-900 flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  区分・練習時間別 費用表
                </h3>
                <span className="text-[10px] font-bold text-ag-lime-700 bg-ag-lime-100 px-2 py-1 rounded tracking-widest uppercase">固定+都度払い</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-ag-gray-50/50 text-ag-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold border-b border-ag-gray-100">会員区分 / 練習時間</th>
                      <th className="px-6 py-4 font-bold border-b border-ag-gray-100 text-center">3時間 (コーチ 有/不在)</th>
                      <th className="px-6 py-4 font-bold border-b border-ag-gray-100 text-center">4時間 (コーチ 有/不在)</th>
                      <th className="px-6 py-4 font-bold border-b border-ag-gray-100">備考</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ag-gray-50">
                    <tr className="hover:bg-ag-lime-50/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-ag-gray-900">通常会員</div>
                        <div className="text-[10px] text-ag-gray-400">登録費 + 月会費3,000円</div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-ag-lime-700">固定 ¥750 相当</td>
                      <td className="px-6 py-4 text-center font-bold text-ag-lime-700">固定 ¥750 相当</td>
                      <td className="px-6 py-4 text-[11px] text-ag-gray-500">一番お得な主役。</td>
                    </tr>
                    <tr className="hover:bg-ag-lime-50/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-ag-gray-800">ライト会員</div>
                        <div className="text-[10px] text-ag-gray-400">登録費済・都度払い</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono font-bold">¥850</span> / <span className="text-ag-gray-400">¥650</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono font-bold">¥1,050</span> / <span className="text-ag-gray-400">¥850</span>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-ag-gray-500 leading-relaxed">
                        850円の根拠: 通常(750) + 協力金100円<br/>
                        ※笠井さん・第2練習：400円
                      </td>
                    </tr>
                    <tr className="hover:bg-ag-lime-50/10 transition-colors">
                      <td className="px-6 py-4 text-ag-gray-600">
                        <div className="font-bold">ビジター</div>
                        <div className="text-[10px]">非会員・当日払い</div>
                      </td>
                      <td className="px-6 py-4 text-center text-ag-gray-500 italic">
                        <span className="font-mono">¥1,100</span> / <span className="font-mono">¥900</span>
                      </td>
                      <td className="px-6 py-4 text-center text-ag-gray-500 italic">
                        <span className="font-mono">¥1,300</span> / <span className="font-mono">¥1,100</span>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-ag-gray-400 italic">お客様価格設定。</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* コーチ契約情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-amber-300 flex items-center justify-center text-2xl shadow-sm flex-shrink-0">🏸</div>
                <div>
                  <h4 className="font-bold text-amber-900 mb-2">コーチ契約内容 (2026/1確認)</h4>
                  <ul className="text-sm text-amber-800 space-y-1.5 list-disc pl-4">
                    <li>3時間練習 (コーチング2H): <strong>¥6,000</strong></li>
                    <li>4時間練習 (コーチング3H): <strong>¥7,000</strong></li>
                    <li>車代（駐車場込）は部費負担</li>
                    <li className="text-xs italic opacity-80">※送迎は契約外、練習最初から最後までご参加。</li>
                  </ul>
                </div>
              </div>
              <div className="bg-ag-gray-900 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl rotate-12">💳</div>
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <span className="text-ag-lime-400">●</span> 会費・登録のルール
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] text-ag-gray-400 font-bold uppercase tracking-widest">年間登録費</div>
                    <div className="text-lg font-bold">¥3,000 <span className="text-xs font-normal text-ag-gray-400">(毎年2月支払い・返金なし)</span></div>
                  </div>
                  <div>
                    <div className="text-[11px] text-ag-gray-400 font-bold uppercase tracking-widest">支払い方法</div>
                    <div className="text-lg font-bold text-ag-lime-400 flex items-center gap-2">
                      PayPay推奨 <span className="text-[10px] bg-ag-lime-500/20 text-ag-lime-300 px-1.5 py-0.5 rounded border border-ag-lime-500/30">履歴重視</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ルールカード */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-ag-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-ag-gray-900 flex items-center gap-2 mb-3">
                  <span className="text-ag-lime-500">✔</span> 1年ごとの更新制度
                </h4>
                <p className="text-xs text-ag-gray-500 leading-relaxed">
                  毎年秋に次年度の継続意思を確認します。これにより「休部」区分は廃止されました。リハビリ参加は基本無料（ゲーム練習はライト会員金額）です。
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-ag-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-ag-gray-900 flex items-center gap-2 mb-3">
                  <span className="text-ag-lime-500">🛡️</span> ライト会員（救済措置）
                </h4>
                <p className="text-xs text-ag-gray-500 leading-relaxed">
                  介護・仕事・療養など特別な事情がある方のための措置です。移行にはメンバーの60%以上の賛同が必要です。
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-ag-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-ag-gray-900 flex items-center gap-2 mb-3">
                  <span className="text-ag-lime-500">🛡️</span> リハビリ措置
                </h4>
                <p className="text-xs text-ag-gray-500 leading-relaxed">
                  基礎打ち・見学は無料です。ゲーム練習への参加はライト会員の都度払い金額となります。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* IV. 練習場所・運用 */}
        {activeTab === "facilities" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-ag-gray-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-ag-gray-100 bg-ag-gray-50/30">
                <h3 className="font-bold text-ag-gray-900 text-lg mb-2 flex items-center gap-2">
                  <span className="text-xl">📍</span> 体育館の確保と運用ルール
                </h3>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="bg-white p-6 rounded-xl border border-ag-gray-200">
                    <h4 className="text-sm font-bold text-ag-gray-800 mb-3 flex items-center justify-between border-b pb-2">
                      <span>1. 確保の方針</span>
                      <span className="text-[10px] text-white bg-ag-gray-900 px-2 py-0.5 rounded italic">都筑区近郊</span>
                    </h4>
                    <p className="text-xs text-ag-gray-500 leading-relaxed">
                      移動負担軽減のため、遠方の体育館は行わず、都筑区近郊に絞って確保します。
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-ag-gray-200">
                    <h4 className="text-sm font-bold text-ag-gray-800 mb-3 border-b pb-2">2. エントリー分担</h4>
                    <ul className="text-xs text-ag-gray-500 leading-relaxed list-disc pl-4 space-y-2">
                      <li>第3週：<strong>チームカード</strong>でスポセン最優先</li>
                      <li>それ以外：各自の<strong>個人カード</strong>で地区センター等の確保にご協力ください。</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="bg-ag-lime-50 rounded-2xl p-6 border border-ag-lime-100">
                    <h4 className="font-bold text-ag-lime-800 mb-3 flex items-center gap-2">
                      <span className="text-xl">🤝</span> 空き枠の「拝借」ルール
                    </h4>
                    <p className="text-xs text-ag-lime-700 leading-relaxed mb-4">
                      チームカードでの当選枠で練習に使わない分などは、メンバーの上達や交流のために活用できます。
                    </p>
                    <div className="bg-white/80 p-3 rounded-lg text-[11px] border border-ag-lime-200 italic">
                      手順：LINEで報告 → 相談し合い → 公平に使いましょう
                    </div>
                  </div>
                  <div className="p-6 bg-red-50 rounded-xl border border-red-100">
                    <h4 className="text-sm font-bold text-red-900 mb-2">体育館係の免責</h4>
                    <p className="text-[11px] text-red-800 leading-relaxed">
                      役割は「抽選エントリーの管理」までです。当選結果（運）について係が責任を負うことはありません。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* V. 役員・組織分担 */}
        {activeTab === "organization" && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-2xl border border-ag-gray-200 shadow-sm p-6 lg:p-10">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h3 className="font-bold text-2xl text-ag-gray-900 mb-3">
                    BB 輪番・グループ制 組織
                  </h3>
                  <p className="text-sm text-ag-gray-500 max-w-xl mx-auto">
                    BBの運営は特定の個人ではなく、全員で少しずつ担当する「お互い様精神」で成り立っています。
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                  {[
                    { role: "代表 (2年)", task: "連盟窓口、試合や講習会の申込" },
                    { role: "部長 (2年)", task: "チーム全体のまとめ、コーチ打ち合わせ" },
                    { role: "事務局 (1年)", task: "名簿・総会資料作成、掲示板管理" },
                    { role: "会計 (1年)", task: "部費集金、経費精算、シャトル管理、保険" },
                    { role: "体育館係", task: "練習場所手配・抽選エントリー管理" },
                    { role: "都筑区役員 (2年)", task: "都筑区レディース連盟の役員業務" },
                    { role: "練習当番 (2ヶ月)", task: "挨拶、シャトル管理、設営・片付け" }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-ag-gray-50/50 border border-ag-gray-100 rounded-2xl hover:bg-white hover:border-ag-lime-200 hover:shadow-sm transition-all">
                      <div className="w-10 h-10 rounded-xl bg-ag-gray-100 border border-ag-gray-200 flex items-center justify-center text-xs font-bold text-ag-gray-400 group-hover:bg-ag-lime-500 group-hover:text-white transition-colors">{i+1}</div>
                      <div>
                        <div className="text-sm font-bold text-ag-gray-900">{item.role}</div>
                        <div className="text-[11px] text-ag-gray-400 mt-1 leading-relaxed">{item.task}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-ag-lime-900 text-white p-8 rounded-3xl shadow-xl">
                    <h4 className="font-bold text-xl mb-6 flex items-center gap-3">
                      <span className="text-ag-lime-400 underline decoration-ag-lime-500 underline-offset-8">【重要】</span> 全員協力
                    </h4>
                    <div className="space-y-6 text-sm">
                      <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-ag-lime-500 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</div>
                        <p className="leading-relaxed"><strong className="text-ag-lime-300">練習当番：</strong> ライト会員の方も、入部時からご協力いただきます。</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-ag-lime-500 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</div>
                        <p className="leading-relaxed"><strong className="text-ag-lime-300">役員：</strong> 入部2年目以降、状況を相談しながら順次担当をお願いします。</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl">
                    <h4 className="text-lg font-bold text-amber-900 mb-6 flex items-center gap-2">
                      <span className="text-xl">🧧</span> 役員手当と負担軽減
                    </h4>
                    <ul className="text-xs text-amber-800 space-y-4">
                      <li className="flex gap-2">
                        <span className="font-bold text-amber-500">○</span>
                        <span>役員手当として一人あたり<strong>年間2,000円</strong>を計上。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-amber-500">○</span>
                        <span>事務作業は練習時間内に完了させ、持ち帰りを極力なくします。</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-amber-500">○</span>
                        <span>ゲーム時のカウントはセルフカウント方式を採用。</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* III & VI. 試合・連盟・保険・おもてなし */}
        {activeTab === "matches" && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-2xl border border-ag-gray-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-ag-gray-100">
                <div className="p-8 space-y-4">
                  <h4 className="font-bold text-ag-gray-900 border-b pb-2 flex items-center gap-2">
                    <span className="text-base">🏆</span> 主要加盟団体
                  </h4>
                  <p className="text-xs text-ag-gray-500 leading-relaxed">
                    都筑区・横浜市・神奈川県の各レディース連盟に登録。市内在住在勤のみ対象となる枠もあります。
                  </p>
                  <div className="text-[10px] bg-ag-gray-50 p-3 rounded-lg border border-ag-gray-100 text-ag-gray-600">
                    団体登録料：部費負担<br/>
                    個人登録費：自己負担
                  </div>
                </div>
                <div className="p-8 space-y-4">
                  <h4 className="font-bold text-ag-gray-900 border-b pb-2 flex items-center gap-2">
                    <span className="text-base">🛡️</span> 保険・試合遵守
                  </h4>
                  <ul className="text-xs text-ag-gray-500 space-y-3">
                    <li className="flex gap-2">
                      <span className="text-ag-lime-600 font-bold">●</span>
                      <span>スポーツ保険は年度初めに希望を確認（任意加入）。</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-ag-lime-600 font-bold">●</span>
                      <span>試合は棄権防止のため時間厳守。欠席は速やかに連絡。</span>
                    </li>
                  </ul>
                </div>
                <div className="p-8 bg-ag-gray-900 text-white space-y-4">
                  <h4 className="font-bold text-ag-lime-400 border-b border-white/20 pb-2 flex items-center gap-2">
                    <span className="text-base">🍵</span> BB主催ゲーム会
                  </h4>
                  <p className="text-xs text-ag-gray-400 leading-relaxed">
                    ビジターの方を温かく迎え、<span className="text-white font-bold italic">審判や片付けをさせない「おもてなし」</span>を徹底する精神です。
                  </p>
                  <div className="text-[10px] text-ag-lime-300 font-bold">
                    シャトル目安：1.5試合につき1個平均
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm">
              <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <span className="text-lg">📢</span> 秋の県団体戦（育成優先方針）
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                BBではチーム力の底上げと育成経験を最優先し、育成枠を含めた構成で臨みます。
              </p>
            </div>
          </div>
        )}

        {/* 精算・車代 (補助情報) */}
        {activeTab === "transport" && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-2xl border border-ag-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-amber-100/50 to-white/50 border-b border-ag-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  車代・精算の仕組み (参考)
                </h3>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-200/50 px-2 py-1 rounded">※燃費 10Km/1L 換算</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-ag-gray-50/50 text-ag-gray-500 text-xs border-b border-ag-gray-100">
                      <th className="px-6 py-4 font-bold">区分</th>
                      <th className="px-6 py-4 font-bold">料金</th>
                      <th className="px-6 py-4 font-bold">対象の目安</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ag-gray-50">
                    <tr className="hover:bg-amber-50/30">
                      <td className="px-6 py-4 font-bold text-red-600">A (10km圏)</td>
                      <td className="px-6 py-4 font-mono font-bold font-mono">¥200</td>
                      <td className="px-6 py-4 text-ag-gray-500">都筑区内、北山田、仲町台、中山</td>
                    </tr>
                    <tr className="hover:bg-amber-50/30">
                      <td className="px-6 py-4 font-bold text-emerald-600">B (20km圏)</td>
                      <td className="px-6 py-4 font-mono font-bold font-mono">¥300</td>
                      <td className="px-6 py-4 text-ag-gray-500">近隣区、港北、藤が丘、白山</td>
                    </tr>
                    <tr className="hover:bg-amber-50/30">
                      <td className="px-6 py-4 font-bold text-amber-500">C (30km圏)</td>
                      <td className="px-6 py-4 font-mono font-bold font-mono">¥400</td>
                      <td className="px-6 py-4 text-ag-gray-500">神奈川区、保土ヶ谷、旭、町田、川崎</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
