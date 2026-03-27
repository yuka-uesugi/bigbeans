"use client";

import { useState } from "react";
import RulesAIChat from "@/components/rules/RulesAIChat";

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState("cars");

  const tabs = [
    { id: "cars", name: "車代・乗り合わせ", icon: "🚗" },
    { id: "duties", name: "練習当番チーム", icon: "🧹" },
    { id: "facilities", name: "体育館・予約情報", icon: "🏢" },
    { id: "rules", name: "基本規約", icon: "📋" },
    { id: "orgs", name: "加盟団体・資料", icon: "🏛️" },
  ];

  // 加盟団体・資料のモックデータ
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgs] = useState([
    { id: "jba", name: "日本バドミントン協会 (日バ)", url: "https://www.badminton.or.jp/", description: "日本のバドミントン競技を統括する団体。登録管理や大会要項の確認に使用。" },
    { id: "pref", name: "神奈川県バドミントン協会", url: "https://www.kanagawa-badminton.com/", description: "県内の大会情報や登録状況の確認用。" },
    { id: "ladies", name: "神奈川県レディースバドミントン連盟", url: "https://www.kanagawa-ladies-bad.com/", description: "レディース大会の要項や議事録が届きます。" },
    { id: "yokohama", name: "横浜市バドミントン協会", url: "https://yokohama-badminton.jp/", description: "横浜市内の大会情報や団体登録用。" },
    { id: "ward", name: "青葉区バドミントン協会", url: "http://aobabado.g2.xrea.com/", description: "区内の身近な大会情報。" },
  ]);

  const [documents] = useState([
    { id: "d1", title: "2025年度 総会議事録", type: "pdf", date: "2025-04-10", tags: ["2025", "横浜市", "日バ"], organization: "日バ" },
    { id: "d2", title: "第40回 県レディース大会 実施要項", type: "pdf", date: "2025-05-15", tags: ["2025", "神奈川県", "県レディース"], organization: "県レディース" },
    { id: "d3", title: "【重要】登録金改定のお知らせ", type: "image", date: "2025-06-01", tags: ["2025", "横浜市"], organization: "横浜市" },
    { id: "d4", title: "区バドミントン協会 役員名簿", type: "pdf", date: "2025-03-20", tags: ["2024", "都筑区", "区バ"], organization: "区バ" },
  ]);

  const [filterTag, setFilterTag] = useState("all");
  const allTags = Array.from(new Set(documents.flatMap(d => d.tags)));

  const filteredDocs = filterTag === "all" 
    ? documents 
    : documents.filter(d => d.tags.includes(filterTag));


  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up pb-32">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ag-gray-900 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            チーム規約・基本情報
          </h1>
          <p className="text-sm text-ag-gray-400 mt-1">
            車代の精算基準や、乗り合わせ表、練習当番などの基本情報を確認できます。画面右下のAIに質問も可能です。
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
        {activeTab === "cars" && (
          <div className="space-y-8 animate-fade-in">
            {/* 車代基準表 */}
            <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r gap-3 from-amber-100 to-amber-50 border-b border-ag-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  ビッグビーンズ車代 (参考値)
                </h3>
               <span className="text-[10px] font-bold text-amber-700 bg-amber-200/50 px-2 py-1 rounded">※燃費平均10Km/1L換算</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar max-w-full">
                <table className="w-full text-left border-collapse min-w-max text-sm">
                  <thead>
                    <tr className="bg-ag-gray-50/50 text-ag-gray-500 uppercase tracking-wider text-xs border-b border-ag-gray-100">
                      <th className="px-5 py-3 font-bold whitespace-nowrap">カテゴリー / 料金</th>
                      <th className="px-5 py-3 font-bold whitespace-nowrap">距離区分</th>
                      <th className="px-5 py-3 font-bold whitespace-nowrap">対象エリア・SC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ag-gray-100 font-medium">
                    <tr className="bg-[#fdebea]/30 hover:bg-[#fdebea]/50 transition-colors">
                      <td className="px-5 py-4"><span className="text-xl font-bold font-mono text-red-600">A</span><span className="ml-3 font-mono text-lg font-bold">¥200</span></td>
                      <td className="px-5 py-4 text-ag-gray-700">区内 (10キロ圏)</td>
                      <td className="px-5 py-4 text-ag-gray-800">都筑SC・青葉SC・緑SC<br/>都筑・北山田・中川西・仲町台・中山</td>
                    </tr>
                    <tr className="bg-[#eefde8]/30 hover:bg-[#eefde8]/50 transition-colors">
                      <td className="px-5 py-4"><span className="text-xl font-bold font-mono text-emerald-600">B</span><span className="ml-3 font-mono text-lg font-bold">¥300</span></td>
                      <td className="px-5 py-4 text-ag-gray-700">近隣区 (20キロ圏)</td>
                      <td className="px-5 py-4 text-ag-gray-800">港北SC<br/>藤が丘・白山・長津田・十日市場・小机・美しが丘西</td>
                    </tr>
                    <tr className="bg-[#fef8e2]/30 hover:bg-[#fef8e2]/50 transition-colors">
                      <td className="px-5 py-4"><span className="text-xl font-bold font-mono text-amber-500">C</span><span className="ml-3 font-mono text-lg font-bold">¥400</span></td>
                      <td className="px-5 py-4 text-ag-gray-700">30キロ圏</td>
                      <td className="px-5 py-4 text-ag-gray-800">神奈川・保土ヶ谷・瀬谷・旭・鶴見・西・平沼<br/>町田・川崎幸・高津</td>
                    </tr>
                    <tr className="bg-[#ffeedb]/30 hover:bg-[#ffeedb]/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-xl font-bold font-mono text-orange-500">D</span>
                        <div className="ml-3 inline-flex flex-col text-sm border-l-2 pl-2 border-orange-200">
                          <span>2人: <strong className="font-mono text-base">¥600</strong></span>
                          <span>3人~: <strong className="font-mono text-base">¥500</strong></span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-ag-gray-700">31〜40キロ圏</td>
                      <td className="px-5 py-4 text-ag-gray-800">中・大和<br/>川崎多摩・カルッツ</td>
                    </tr>
                    <tr className="bg-[#ffe8e8]/30 hover:bg-[#ffe8e8]/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-xl font-bold font-mono text-rose-500">E</span>
                        <div className="ml-3 inline-flex flex-col text-sm border-l-2 pl-2 border-rose-200">
                          <span>2人: <strong className="font-mono text-base">¥700</strong></span>
                          <span>3人~: <strong className="font-mono text-base">¥600</strong></span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-ag-gray-700">41〜55キロ圏</td>
                      <td className="px-5 py-4 text-ag-gray-800">戸塚・港南・南・泉・栄<br/>座間・善行・調布</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 乗り合わせ参考表 */}
            <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r gap-3 from-green-100 to-green-50 border-b border-ag-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-green-900 flex items-center gap-2">
                  <span className="text-xl">🚙</span>
                  コーチ車 ＆ 乗り合わせ 参考表
                </h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-max text-sm">
                  <thead>
                    <tr className="bg-ag-gray-50/50 text-ag-gray-500 text-xs border-b border-ag-gray-100">
                      <th className="px-5 py-3 font-bold whitespace-nowrap">エリア</th>
                      <th className="px-5 py-3 font-bold whitespace-nowrap">料金</th>
                      <th className="px-5 py-3 font-bold whitespace-nowrap">体育館</th>
                      <th className="px-5 py-3 font-bold whitespace-nowrap">コーチ車・車出し</th>
                      <th className="px-5 py-3 font-bold whitespace-nowrap">乗り合わせメンバー</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ag-gray-100 font-medium">
                    {/* Area A */}
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#fdebea]/10 border-t-2 border-ag-gray-200">
                      <td className="px-5 py-3 text-red-600 font-bold" rowSpan={4}>A</td>
                      <td className="px-5 py-3 font-mono font-bold" rowSpan={4}>¥200</td>
                      <td className="px-5 py-3">仲町台</td>
                      <td className="px-5 py-3"><span className="inline-block px-2 py-0.5 bg-yellow-100/50 rounded text-yellow-800 border border-yellow-200">上杉</span></td>
                      <td className="px-5 py-3 text-ag-gray-700">上前</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#fdebea]/10 border-t border-dashed border-ag-gray-100">
                      <td className="px-5 py-3 text-ag-gray-400">〃</td>
                      <td className="px-5 py-3 text-ag-gray-800">富岡</td>
                      <td className="px-5 py-3 text-ag-gray-700">黒岩・村井・播川</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#fdebea]/10 border-t border-dashed border-ag-gray-100">
                      <td className="px-5 py-3">中川西</td>
                      <td className="px-5 py-3"><span className="inline-block px-2 py-0.5 bg-yellow-100/50 rounded text-yellow-800 border border-yellow-200">五十嵐</span></td>
                      <td className="px-5 py-3 text-ag-gray-700">上杉</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#fdebea]/10 border-t border-dashed border-ag-gray-100">
                      <td className="px-5 py-3 text-ag-gray-400">〃</td>
                      <td className="px-5 py-3 text-ag-gray-800">山本</td>
                      <td className="px-5 py-3 text-ag-gray-700">伊藤・小川・原田</td>
                    </tr>

                    {/* Area B */}
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#eefde8]/20 border-t-2 border-ag-gray-200">
                      <td className="px-5 py-3 text-emerald-600 font-bold" rowSpan={3}>B</td>
                      <td className="px-5 py-3 font-mono font-bold" rowSpan={3}>¥300</td>
                      <td className="px-5 py-3">港北SC・藤が丘 他</td>
                      <td className="px-5 py-3"><span className="inline-block px-2 py-0.5 bg-yellow-100/50 rounded text-yellow-800 border border-yellow-200">富岡</span></td>
                      <td className="px-5 py-3 text-ag-gray-700">村井・黒岩・播川</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#eefde8]/20 border-t border-dashed border-ag-gray-100">
                      <td className="px-5 py-3 text-ag-gray-400">〃</td>
                      <td className="px-5 py-3 text-ag-gray-800">上杉</td>
                      <td className="px-5 py-3 text-ag-gray-700">五十嵐・上前・小川</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#eefde8]/20 border-t border-dashed border-ag-gray-100">
                      <td className="px-5 py-3 text-ag-gray-400">〃</td>
                      <td className="px-5 py-3 text-ag-gray-800">山本</td>
                      <td className="px-5 py-3 text-ag-gray-700">伊藤・原田</td>
                    </tr>

                    {/* Area C */}
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#fef8e2]/20 border-t-2 border-ag-gray-200">
                      <td className="px-5 py-3 text-amber-500 font-bold" rowSpan={3}>C</td>
                      <td className="px-5 py-3 font-mono font-bold" rowSpan={3}>¥400</td>
                      <td className="px-5 py-3">神奈川SC 他</td>
                      <td className="px-5 py-3"><span className="inline-block px-2 py-0.5 bg-yellow-100/50 rounded text-yellow-800 border border-yellow-200">富岡</span></td>
                      <td className="px-5 py-3 text-ag-gray-700">黒岩・村井</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#fef8e2]/20 border-t border-dashed border-ag-gray-100">
                      <td className="px-5 py-3 text-ag-gray-400">〃</td>
                      <td className="px-5 py-3 text-ag-gray-800">五十嵐</td>
                      <td className="px-5 py-3 text-ag-gray-700">上杉・上前・原田</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-[#fef8e2]/20 border-t border-dashed border-ag-gray-100">
                      <td className="px-5 py-3 text-ag-gray-400">〃</td>
                      <td className="px-5 py-3 text-ag-gray-800">山本</td>
                      <td className="px-5 py-3 text-ag-gray-700">伊藤・小川</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "duties" && (
          <div className="space-y-8 animate-fade-in">
            {/* 練習当番表 */}
            <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden p-6 text-center max-w-2xl mx-auto">
              <h2 className="text-xl font-bold tracking-widest text-ag-gray-900 mb-6 border-b border-ag-gray-200 pb-3">
                ２０２６年 練習当番チーム
              </h2>
              
              <div className="grid grid-cols-3 border-t-2 border-l-2 border-ag-gray-900">
                {/* Headers */}
                <div className="bg-[#f0d8e4] p-3 border-r-2 border-b-2 border-ag-gray-900 flex flex-col items-center justify-center font-bold text-lg text-ag-gray-800 leading-tight">
                  <span>2月3月</span>
                  <span>8月9月</span>
                </div>
                <div className="bg-[#d4edd2] p-3 border-r-2 border-b-2 border-ag-gray-900 flex flex-col items-center justify-center font-bold text-lg text-ag-gray-800 leading-tight">
                  <span>4月5月</span>
                  <span>10月11月</span>
                </div>
                <div className="bg-[#ffe8cd] p-3 border-r-2 border-b-2 border-ag-gray-900 flex flex-col items-center justify-center font-bold text-lg text-ag-gray-800 leading-tight">
                  <span>6月7月</span>
                  <span>12月1月</span>
                  <span className="text-xs font-semibold mt-1">※お楽しみ会担当</span>
                </div>

                {/* Rows (Members) */}
                <div className="p-3 border-r-2 border-b-2 border-ag-gray-900 flex flex-col gap-2 font-bold text-lg text-ag-gray-800">
                  <div className="py-1">山本</div><div className="py-1">伊藤</div><div className="py-1">播川</div><div className="py-1">石川</div><div className="py-1">戸越</div>
                </div>
                <div className="p-3 border-r-2 border-b-2 border-ag-gray-900 flex flex-col gap-2 font-bold text-lg text-ag-gray-800">
                  <div className="py-1">五十嵐</div><div className="py-1">小川</div><div className="py-1">黒岩</div><div className="py-1">上杉</div><div className="py-1">石井</div>
                </div>
                <div className="p-3 border-r-2 border-b-2 border-ag-gray-900 flex flex-col gap-2 font-bold text-lg text-ag-gray-800">
                  <div className="py-1">上前</div><div className="py-1">西脇</div><div className="py-1">藤田</div><div className="py-1">原田</div><div className="py-1">富岡</div>
                  <div className="py-1 text-sm bg-ag-gray-100">村井(休部中)</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "facilities" && (
          <div className="space-y-8 animate-fade-in pb-10">
            {/* 地区センター等 */}
            <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r gap-3 from-amber-100 to-amber-50 border-b border-ag-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-amber-900 flex items-center gap-2">
                  <span className="text-xl">🏢</span> 練習場所・登録カード一覧表（地区センター等）
                </h3>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-200/50 px-2 py-1 rounded">2025年12月現在</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-max text-[11px] font-medium leading-relaxed">
                  <thead>
                    <tr className="bg-ag-gray-50 text-ag-gray-500 uppercase tracking-wider border-b border-ag-gray-200">
                      <th className="px-3 py-2 font-bold whitespace-nowrap">施設</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap text-center">発表日</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap text-center">抽選日</th>
                      <th className="px-2 py-2 font-bold whitespace-nowrap text-center">AM/PM</th>
                      <th className="px-2 py-2 font-bold whitespace-nowrap text-center">支払い</th>
                      <th className="px-2 py-2 font-bold whitespace-nowrap text-center">抽選枠</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap bg-amber-50 block md:table-cell">団体名</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap bg-amber-50">ID</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap bg-amber-50">代表者</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap bg-amber-50">連絡者</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap">備考・駐車場</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ag-gray-100 text-ag-gray-800">
                    
                    {/* 都筑 */}
                    <tr className="hover:bg-ag-gray-50 transition-colors">
                      <td className="px-3 py-3 align-top font-bold" rowSpan={5}>都筑地区センター</td>
                      <td className="px-3 py-3 align-top text-center" rowSpan={5}>15日</td>
                      <td className="px-3 py-3 align-top text-center" rowSpan={5}>2か月前<br/>10日</td>
                      <td className="px-2 py-3 align-top text-center" rowSpan={5}>〇 〇</td>
                      <td className="px-2 py-3 align-top text-center" rowSpan={5}>当日</td>
                      <td className="px-2 py-3 align-top text-center bg-ag-gray-50 border-b border-white border-r">2</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold">ビッグビーンズ</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">21100052</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">村井 庸子</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 bg-yellow-100/50">新庄</td>
                      <td className="px-3 py-2 text-[10px] text-ag-gray-500 max-w-[150px]" rowSpan={2}>
                        キャンセルは電話<br/>団体登録更新なし
                      </td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors">
                      <td className="px-2 py-2 align-top text-center bg-ag-gray-50 border-b border-white border-r">2</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold">ベリー</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">21100065</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 bg-yellow-100/50">北村 喜久江</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">伊藤</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors">
                      <td className="px-2 py-2 align-top text-center bg-ag-gray-50 border-b border-white border-r">2</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold">さくら</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">21100089</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">山本 優美子</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 bg-yellow-100/50">島田</td>
                      <td className="px-3 py-2 text-[10px] text-ag-gray-500 max-w-[150px]" rowSpan={2}>
                         不定期で会員新...備品入力必要
                      </td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors">
                      <td className="px-2 py-2 align-top text-center bg-ag-gray-50 border-b border-white border-r">2</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold">セカンドゲーム</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">21100012</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">上前 祥子</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">西脇</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors bg-yellow-50/50">
                      <td className="px-2 py-2 align-top text-center bg-ag-gray-50 border-r border-ag-gray-100">2</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold">ポプラ (第2練)</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">21100025</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 bg-yellow-200/50">中山 理子</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">上杉</td>
                      <td className="px-3 py-2 text-[10px] text-yellow-900 border-t border-yellow-200">中山・島田・新庄・北村: 更新無</td>
                    </tr>

                    {/* 北山田他 */}
                    <tr className="hover:bg-ag-gray-50 transition-colors border-t-[3px] border-ag-gray-200">
                      <td className="px-3 py-3 align-top font-bold text-ag-gray-700" rowSpan={5}>
                        北山田地区<br/>中川西地区<br/>仲町台地区
                      </td>
                      <td className="px-3 py-3 align-top text-center" rowSpan={5}>15日</td>
                      <td className="px-3 py-3 align-top text-center" rowSpan={5}>2か月前<br/>10日</td>
                      <td className="px-2 py-3 align-top text-center text-[9px] text-ag-gray-500" rowSpan={5}>自主<br/>事業<br/>〇 〇</td>
                      <td className="px-2 py-3 align-top text-center" rowSpan={5}>当日</td>
                      <td className="px-2 py-2 align-top text-center bg-ag-gray-50 border-b border-white border-r">12</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold">ビッグビーンズ</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">18300111</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">村井 庸子</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">村井</td>
                      <td className="px-3 py-2 text-[10px] text-ag-gray-500" rowSpan={2}>
                        キャンセルWEB可<br/>代表者: 1団体のみ<br/><span className="text-orange-600 font-bold">構成員1名でOK</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors">
                      <td className="px-2 py-2 align-top text-center bg-ag-gray-50 border-b border-white border-r">12</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold">さくらBADO</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">18100101</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">山本 優美子</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">小川</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors">
                      <td className="px-2 py-2 align-top text-center bg-sky-50 text-sky-600 border-b border-white border-r">12</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold text-sky-700">トリプルス</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">25200008</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">原田 麻美</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">戸越</td>
                      <td className="px-3 py-2 text-[10px] text-ag-gray-500" rowSpan={3}>
                        P: 前日14時先着<br/>仲町台、補助ネット
                      </td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors">
                      <td className="px-2 py-2 align-top text-center bg-sky-50 text-sky-600 border-b border-white border-r">12</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold text-sky-700">タルト</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">25100006</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">戸越 美咲</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">富岡</td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors">
                      <td className="px-2 py-2 align-top text-center bg-ag-gray-50 border-r border-ag-gray-100">12</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold">(チャリチャリ)</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-xs">21200047</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">伊藤 深雪</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">西脇</td>
                    </tr>

                    {/* その他 */}
                    <tr className="hover:bg-ag-gray-50 transition-colors border-t-[3px] border-ag-gray-200">
                      <td className="px-3 py-3 font-bold">中山地区センター</td>
                      <td className="px-3 py-3 text-center">11日</td>
                      <td className="px-3 py-3 text-center">2か月前<br/>7日</td>
                      <td className="px-2 py-3 text-center">〇 〇</td>
                      <td className="px-2 py-3 text-center text-white bg-red-500 font-bold">当選月16日<br/>〜月末</td>
                      <td className="px-2 py-3 text-center bg-ag-gray-50 border-r border-ag-gray-100">5</td>
                      <td className="px-3 py-3 border-r border-ag-gray-100 font-bold">ビッグビーンズ</td>
                      <td className="px-3 py-3 border-r border-ag-gray-100 font-mono text-xs">22520027</td>
                      <td className="px-3 py-3 border-r border-ag-gray-100">五十嵐 明美</td>
                      <td className="px-3 py-3 border-r border-ag-gray-100 bg-yellow-100">中山</td>
                      <td className="px-3 py-3 text-[10px] text-ag-gray-500">代表: 2団体迄登録可<br/><span className="text-orange-600 font-bold text-[9px]">登録者名簿5人分必要</span></td>
                    </tr>
                    <tr className="hover:bg-ag-gray-50 transition-colors border-t border-ag-gray-200">
                      <td className="px-3 py-3 font-bold">白山</td>
                      <td className="px-3 py-3 text-center"></td>
                      <td className="px-3 py-3 text-center text-[9px]">2ヶ月前応答日<br/>当日まで</td>
                      <td className="px-2 py-3 text-center">〇 〇</td>
                      <td className="px-2 py-3 text-center text-white bg-red-500 font-bold">当選すぐ</td>
                      <td className="px-2 py-3 text-center bg-ag-gray-50 border-r border-ag-gray-100">4</td>
                      <td className="px-3 py-3 border-r border-ag-gray-100 font-bold">さくらBADO</td>
                      <td className="px-3 py-3 border-r border-ag-gray-100 font-mono text-xs">1538</td>
                      <td className="px-3 py-3 border-r border-ag-gray-100">伊藤 深雪</td>
                      <td className="px-3 py-3 border-r border-ag-gray-100 bg-yellow-100">上前</td>
                      <td className="px-3 py-3 text-[10px] text-ag-gray-500">駐輪のみ 近隣P利用</td>
                    </tr>
                    
                    <tr className="hover:bg-ag-gray-50 transition-colors border-t-[3px] border-ag-gray-200">
                      <td className="px-3 py-2 font-bold text-ag-gray-600">藤が丘/美しが丘西</td>
                      <td className="px-3 py-2 text-center text-[10px]">13日</td>
                      <td className="px-3 py-2 text-center text-[10px]">2か月前<br/>10日</td>
                      <td className="px-2 py-2 text-center">〇 〇</td>
                      <td className="px-2 py-2 text-center">当日</td>
                      <td className="px-2 py-2 text-center bg-ag-gray-50 border-r border-ag-gray-100">2</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-bold">ビッグビーンズ</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100 font-mono text-[9px]">030522<br/>都度登録</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">上杉 由華</td>
                      <td className="px-3 py-2 border-r border-ag-gray-100">-</td>
                      <td className="px-3 py-2 text-[10px] text-sky-600">1台のみ、1ヶ月前予約</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ハマスポ / スポーツセンター */}
            <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r gap-3 from-sky-100 to-sky-50 border-b border-ag-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-sky-900 flex items-center gap-2">
                  <span className="text-xl">🎽</span> スポーツセンター（ハマスポ）登録カード
                </h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-max text-[11px] font-medium leading-relaxed">
                  <thead>
                     <tr className="bg-sky-50/50 text-sky-800 uppercase tracking-wider border-b border-sky-100">
                      <th className="px-4 py-3 font-bold whitespace-nowrap">有効期限<br/>(更新月)</th>
                      <th className="px-2 py-3 font-bold whitespace-nowrap text-center">発表</th>
                      <th className="px-2 py-3 font-bold whitespace-nowrap text-center">抽選</th>
                      <th className="px-2 py-3 font-bold whitespace-nowrap text-center">枠</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">団体名</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">ID</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap text-ag-gray-900">代表者</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap text-ag-gray-900">構成員メンバー</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/50">
                    <tr className="hover:bg-sky-50/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-sky-700">2028年3月</td>
                      <td className="px-2 py-3 text-center" rowSpan={4}>3日</td>
                      <td className="px-2 py-3 text-center" rowSpan={4}>末日</td>
                      <td className="px-2 py-3 text-center font-bold" rowSpan={4}>8</td>
                      <td className="px-4 py-3 font-bold text-ag-gray-800">ベリー</td>
                      <td className="px-4 py-3 font-mono text-xs text-ag-gray-500">00072809</td>
                      <td className="px-4 py-3 font-bold">上前</td>
                      <td className="px-4 py-3 text-ag-gray-600"><span className="text-pink-600">北村</span> 戸越 <span className="text-pink-600">中山</span> 上杉</td>
                    </tr>
                    <tr className="hover:bg-sky-50/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-sky-700">2028年7月</td>
                      <td className="px-4 py-3 font-bold text-ag-gray-800">レグルス</td>
                      <td className="px-4 py-3 font-mono text-xs text-ag-gray-500">00073810</td>
                      <td className="px-4 py-3 font-bold">山本</td>
                      <td className="px-4 py-3 text-ag-gray-600">播川 <span className="text-pink-600">中村</span> 原田 藤田</td>
                    </tr>
                    <tr className="hover:bg-sky-50/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-sky-700">2028年10月</td>
                      <td className="px-4 py-3 font-bold text-ag-gray-800">ビッグビーンズ</td>
                      <td className="px-4 py-3 font-mono text-xs text-ag-gray-500">00099370</td>
                      <td className="px-4 py-3 font-bold">小川</td>
                      <td className="px-4 py-3 text-ag-gray-600"><span className="text-pink-600">中川</span> 原 播川 藤田</td>
                    </tr>
                    <tr className="hover:bg-sky-50/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-sky-700">2029年1月</td>
                      <td className="px-4 py-3 font-bold text-ag-gray-800">オレンジ</td>
                      <td className="px-4 py-3 font-mono text-xs text-ag-gray-500">00072909</td>
                      <td className="px-4 py-3 font-bold">上杉</td>
                      <td className="px-4 py-3 text-ag-gray-600">石井 伊藤 富岡 西脇</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-red-50 p-4 border border-red-200 rounded-xl text-xs text-red-800 shadow-sm mt-4">
              <strong>【特記事項】</strong><br/>
              ※ パスワードは全て名簿・マイページ裏で管理しています。<br/>
              ※ <strong>代表者・構成員</strong>になれる方を常に準備し、退部者等が出た場合は名簿を確認の上、更新手続き（2027年役員申送事項）を行ってください。
            </div>
          </div>
        )}

        {activeTab === "orgs" && (
          <div className="space-y-8 animate-fade-in max-w-5xl">
            {/* 加盟団体リスト */}
            <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-ag-gray-50 to-white border-b border-ag-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-ag-gray-900 flex items-center gap-2">
                  <span className="text-xl">🏛️</span>
                  加盟団体リンク集
                </h3>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {orgs.map(org => (
                    <a 
                      key={org.id} 
                      href={org.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group p-4 rounded-xl border border-ag-gray-100 bg-ag-gray-50/30 hover:bg-white hover:border-ag-lime-200 hover:shadow-md transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ag-gray-800 group-hover:text-ag-lime-700 transition-colors uppercase text-sm tracking-tight">{org.name}</span>
                        <svg className="w-4 h-4 text-ag-gray-400 group-hover:text-ag-lime-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-xs text-ag-gray-500 leading-relaxed">{org.description}</p>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* 資料ライブラリ */}
            <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-ag-gray-200 bg-gradient-to-r from-ag-lime-50/50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-ag-gray-900 flex items-center gap-2">
                    <span className="text-xl">✉️</span>
                    お手紙・資料ライブラリ
                  </h3>
                  <p className="text-[10px] text-ag-gray-500 mt-0.5">総会議事録や大会要項など、紙で届いた資料をデジタル保存しています。</p>
                </div>
                
                <button 
                  onClick={() => setShowOrgForm(!showOrgForm)}
                  className="px-4 py-2 bg-ag-lime-500 text-white font-bold text-xs rounded-xl hover:bg-ag-lime-600 transition-colors shadow-sm shadow-ag-lime-500/20 whitespace-nowrap"
                >
                  {showOrgForm ? "閉じる" : "＋ 資料を追加"}
                </button>
              </div>

              {showOrgForm && (
                <div className="p-6 bg-ag-gray-50 border-b border-ag-gray-200 animate-slide-down">
                  <div className="max-w-xl space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-ag-gray-500">タイトル</label>
                        <input type="text" className="w-full bg-white border border-ag-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ag-lime-500 outline-none" placeholder="例: 大会要項など" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-ag-gray-500">発行日</label>
                        <input type="date" className="w-full bg-white border border-ag-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ag-lime-500 outline-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ag-gray-500">ファイル (PDF/JPEG)</label>
                      <div className="border-2 border-dashed border-ag-gray-200 rounded-xl p-4 text-center bg-white hover:border-ag-lime-400 transition-colors cursor-pointer">
                        <span className="text-xs text-ag-gray-400 font-medium">クリックまたはドラッグ＆ドロップで選択</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ag-gray-500">タグ (年度、地域、団体名など)</label>
                      <input type="text" className="w-full bg-white border border-ag-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ag-lime-500 outline-none" placeholder="例: 2025, 横浜市, 日バ" />
                    </div>
                    <button className="w-full py-2.5 bg-ag-gray-900 text-white font-bold text-sm rounded-xl hover:bg-ag-gray-800 transition-colors">保存する</button>
                  </div>
                </div>
              )}

              {/* フィルター */}
              <div className="px-6 py-3 bg-ag-gray-50/50 border-b border-ag-gray-200 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-ag-gray-400 mr-2">タグで絞り込み:</span>
                <button 
                  onClick={() => setFilterTag("all")}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${filterTag === 'all' ? 'bg-ag-lime-500 text-white shadow-sm' : 'bg-white border border-ag-gray-200 text-ag-gray-600 hover:bg-ag-gray-50'}`}
                >
                  すべて
                </button>
                {allTags.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setFilterTag(tag)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${filterTag === tag ? 'bg-ag-lime-500 text-white shadow-sm' : 'bg-white border border-ag-gray-200 text-ag-gray-600 hover:bg-ag-gray-50'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              {/* 資料リスト */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max text-sm">
                  <thead>
                    <tr className="bg-ag-gray-50/30 text-ag-gray-500 uppercase tracking-widest text-[10px] border-b border-ag-gray-100">
                      <th className="px-6 py-3 font-bold">資料タイトル</th>
                      <th className="px-6 py-3 font-bold">発行団体</th>
                      <th className="px-6 py-3 font-bold">タグ</th>
                      <th className="px-6 py-3 font-bold">日付</th>
                      <th className="px-6 py-3 font-bold text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ag-gray-50">
                    {filteredDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-ag-lime-50/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${doc.type === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                              {doc.type === 'pdf' ? 'PDF' : 'IMG'}
                            </span>
                            <span className="font-bold text-ag-gray-800">{doc.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-ag-gray-100 text-ag-gray-600 rounded font-bold text-[10px]">{doc.organization}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.map(tag => (
                              <span key={tag} className="text-[10px] text-ag-gray-400 font-medium">#{tag}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-mono text-ag-gray-500">{doc.date}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="p-2 text-ag-gray-400 hover:text-ag-lime-600 hover:bg-ag-lime-50 rounded-lg transition-all cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-6 animate-fade-in max-w-3xl">
            <div className="bg-white rounded-2xl border border-ag-gray-200/60 shadow-sm p-6 lg:p-8">
              <h3 className="text-lg font-bold text-ag-gray-900 mb-4 border-b pb-3">クラブ運営 基本規約</h3>
              <div className="prose prose-sm text-ag-gray-700 max-w-none space-y-4">
                <p><strong>第1条（安全配慮）:</strong> 練習に参加する者は自身の体調管理を行い、怪我等の責任は自己で負うものとする。（スポーツ保険への加入を推奨）</p>
                <p><strong>第2条（出欠回答の義務）:</strong> 体育館確保およびコート割作成のため、カレンダーでの出欠回答は「練習日の3日前」までに完了すること。</p>
                <p><strong>第3条（会費）:</strong> ビジターの参加費は1回 600円とする。正式メンバーの月会費は別途案内する口座または会計システムで納入すること。</p>
                <div className="bg-ag-gray-50 p-4 border border-ag-gray-200 rounded-xl text-xs text-ag-gray-500 mt-6">
                  ※これらの規約に関して疑問がある場合は、画面右下のAIサポートをご利用ください。
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右下のフローティング AI チャット */}
      <RulesAIChat />

    </div>
  );
}
