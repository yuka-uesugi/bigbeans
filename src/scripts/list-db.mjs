import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function check() {
  console.log('Listing facility_cards:');
  const snap = await getDocs(collection(db, 'facility_cards'));
  snap.forEach(doc => {
    console.log(`- ID: ${doc.id}, Name: ${doc.data().name}`);
  });

  console.log('\nListing hamaspo_cards:');
  const snap2 = await getDocs(collection(db, 'hamaspo_cards'));
  snap2.forEach(doc => {
    console.log(`- ID: ${doc.id}, Team: ${doc.data().teamName}`);
  });
  
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
