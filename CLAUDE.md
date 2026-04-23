@AGENTS.md

# BigBeans プロジェクト 開発ルール（必ず守ること）

## デザイン最重要ルール（老眼対策）

チームメンバーは40〜60代が中心です。以下のルールをすべてのUI実装で守ること。

### 文字サイズ・太さ
- 本文テキスト: `text-sm`（14px）以上
- 重要な情報（日付・場所・名前など）: `text-base`（16px）以上
- ラベル・バッジ・補足テキスト: `text-xs`（12px）以上
- **`text-[8px]` `text-[9px]` `text-[10px]` `text-[11px]` は禁止**
- フォントウェイト: `font-bold` または `font-black` を基本とする

### 絵文字禁止
- UIコンポーネント内で絵文字（🏸 📋 ✅ など）を使わない
- 代替: SVGアイコン、またはテキストラベル（OK / NG / BB など）
- 既存コードに絵文字がある場合も、編集時に合わせて取り除く

---

## システム概要

Firebase (Firestore / Auth) + Next.js App Router のチーム運営アプリ。
ロール: admin > supporter > member > pending > rejected
設定定数: src/data/rulesData.ts（BOOKING_SCHEDULE_RULES など）
