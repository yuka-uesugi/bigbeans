import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// .env.local から環境変数を読み込む簡易関数
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FACILITY_CARDS = [
  {
    id: "tsuzuki",
    name: "都筑地区センター",
    releaseDay: "15日",
    drawDay: "2か月前10日",
    hasAM: true,
    hasPM: true,
    paymentTiming: "当日",
    registrations: [
      { teamName: "ビッグビーンズ", slots: 2, id: "2110005", password: "bb1964wed" },
      { teamName: "ベリー", slots: 2, id: "2110065", password: "Berry2020" },
      { teamName: "さくら", slots: 2, id: "2110089", password: "SakuraB5402" },
      { teamName: "セカンドゲーム", slots: 2, id: "2110012", password: "Second5080" },
      { teamName: "ポプラ（第2練）", slots: 2, id: "2110025", password: "Popura3452" },
    ],
    representative: "村井 庸子",
    contact: "新庄",
    parking: "中山・島田・新庄・北村、更新がないため継続利用許可済2025年7月現在",
    notes: "キャンセルは電話。団体登録更新なし。不定期で会員新ステム2021年（備品入力、ネット、補助ネット）。代表者：1団体のみ登録可能",
  },
  {
    id: "joint-districts-3",
    name: "中川西・北山田・仲町台 (3地区合同ID)",
    releaseDay: "15日",
    drawDay: "—",
    hasAM: false,
    hasPM: false,
    paymentTiming: "自主事業・当日",
    registrations: [
      { teamName: "ビッグビーンズ", slots: 12, id: "18300111", password: "bb1964wed" },
      { teamName: "さくらBADO", slots: 12, id: "18101001", password: "sakurabado" },
      { teamName: "トリプルス", slots: 12, id: "25200008", password: "triples2025" },
      { teamName: "タルト", slots: 12, id: "25100006", password: "tarttart1" },
      { teamName: "チャリチャリ", slots: 12, id: "2100047", password: "charichari89" },
    ],
    representative: "山本 / 原田 / 村井",
    contact: "村井・小川・戸越",
    parking: "仲町台：前日14時先着電話受付。備品入力、駐車場、ネット、補助",
    notes: "3地区センター合同ID運用。キャンセルWEB可(北山田)・電話(仲町台)。2023年〜仲町台新システム(登録者名簿5名分必要)。代表者：1団体のみ登録可能(中川西)",
  },
  {
    id: "nakayama",
    name: "中山地区センター",
    releaseDay: "11日",
    drawDay: "2か月前〜月末",
    hasAM: true,
    hasPM: true,
    paymentTiming: "当選後16日〜月末",
    registrations: [
      { teamName: "ビッグビーンズ", slots: 5, id: "22520027", password: "bb1964we" },
    ],
    representative: "五十嵐 明美",
    contact: "中山",
    parking: "",
    notes: "団体登録更新なし（連絡者）継続利用許可済",
  },
  {
    id: "hakusan",
    name: "白山地区センター",
    releaseDay: "—",
    drawDay: "2か月前当日〜応答日まで",
    hasAM: false,
    hasPM: false,
    paymentTiming: "—",
    registrations: [
      { teamName: "さくらBADO", slots: 4, id: "1538", password: "sakura88" },
    ],
    representative: "伊藤 深雪",
    contact: "上前",
    parking: "なし。近隣有料P利用。夏季エアコンなし注意",
    notes: "当選まですべて当日まで",
  },
  {
    id: "joint-districts-2",
    name: "藤が丘・美しが丘西 (合同ID)",
    releaseDay: "13日",
    drawDay: "2か月前",
    hasAM: false,
    hasPM: false,
    paymentTiming: "当日",
    registrations: [
      { teamName: "ビッグビーンズ / BB", slots: 4, id: "030522", password: "bb1964we" },
    ],
    representative: "上杉由華",
    contact: "上杉由華",
    parking: "藤が丘：1台(1ヶ月前予約)。美しが丘：1団体、午前2台、午後3台",
    notes: "2地区合同ID(030522)運用。どちらも夏季エアコン注意。体育館担当メアド bb1964we... 共通利用",
  },
];

async function cleanupAndRestore() {
  console.log('Starting cleanup and restoration (final PW update)...');

  // 1. 古い個別IDの削除 (念のため再実行)
  const oldIds = ['kitayamata', 'nakagawa-nishi', 'nakamachidai', 'fujigaoka', 'utsukushigaoka'];
  for (const id of oldIds) {
    await deleteDoc(doc(db, 'facility_cards', id));
  }

  // 2. 新規データの更新
  for (const card of FACILITY_CARDS) {
    await setDoc(doc(db, 'facility_cards', card.id), card);
  }

  console.log('Final restoration completed successfully.');
  process.exit(0);
}

cleanupAndRestore().catch(err => {
  console.error('Restoration failed:', err);
  process.exit(1);
});
