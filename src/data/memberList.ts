
export interface Member {
  id: number;
  role?: string;
  name: string;
  jbaId?: string;
  refereeYear?: string;
  email?: string;
  gymRoles?: {
    tsuzukiRep?: string;
    tsuzukiContact?: string;
    sposenRep?: string;
    sposenMember?: string;
    threeDistrictRep?: string;
    threeDistrictContact?: string;
    otherRep?: string;
    otherContact?: string;
  };
  postCode?: string;
  address?: string;
  phone?: string;
  age?: number;
  birthday?: string;
  joinedDate?: string;
  hamakkoExpiry?: string;
  notificationPrefs?: {
    practiceUpdates?: "email" | "line" | "app" | "none";
    lightMemberRequests?: "email" | "line" | "app" | "none";
  };
  membershipType?: "official" | "light" | "coach" | "visitor";  // 会員種別
}

export const memberList: Member[] = [
  {
    id: 1,
    name: "小川 徳子",
    email: "kumako.chax2@gmail.com",
    gymRoles: { sposenMember: "BB", threeDistrictContact: "さくらB" },
    postCode: "224-0033",
    address: "都筑区茅ヶ崎南1-3-7",
    phone: "080-5436-9166",
    age: 67,
    birthday: "1958/8/2",
    hamakkoExpiry: "2028/8/31",
    membershipType: "official"
  },
  {
    id: 2,
    name: "村井 庸子",
    jbaId: "1400989288",
    refereeYear: "2026",
    email: "yoko112981@gmail.com",
    gymRoles: { tsuzukiRep: "BB", threeDistrictRep: "BB", threeDistrictContact: "BB" },
    postCode: "224-0021",
    address: "都筑区北山田4-15-18",
    phone: "080-5464-0154",
    age: 61,
    birthday: "1964/5/7",
    joinedDate: "2002/10",
    membershipType: "official"
  },
  {
    id: 3,
    role: "会計",
    name: "五十嵐 明美",
    jbaId: "1600323417",
    email: "igak1010@yahoo.co.jp",
    gymRoles: { otherRep: "中山BB" },
    postCode: "224-0053",
    address: "都筑区加賀原1-24-18",
    phone: "080-6778-8597",
    age: 69,
    birthday: "1956/10",
    joinedDate: "2003/3",
    membershipType: "official"
  },
  {
    id: 4,
    name: "西脇 志野",
    jbaId: "1700323423",
    refereeYear: "2027",
    email: "shino.rt3201@gmail.com",
    gymRoles: { tsuzukiContact: "セカンドゲーム", sposenRep: "オレンジ", threeDistrictContact: "チャリチャリ" },
    postCode: "224-0062",
    address: "都筑区大丸11-8-202",
    phone: "090-6504-1023",
    age: 57,
    birthday: "1968/10",
    joinedDate: "2005/5",
    hamakkoExpiry: "2026/1/31",
    membershipType: "official"
  },
  {
    id: 5,
    name: "黒岩 さおり",
    jbaId: "1800323422",
    refereeYear: "2025",
    email: "sakur06099610@gmail.com",
    gymRoles: { tsuzukiRep: "X" },
    postCode: "224-0021",
    address: "都筑区北山田5-6-2-501",
    phone: "090-9640-4326",
    age: 61,
    birthday: "1964/6/9",
    joinedDate: "2005/5",
    membershipType: "official"
  },
  {
    id: 6,
    role: "事務局",
    name: "伊藤 深雪",
    jbaId: "1500323418",
    refereeYear: "2027",
    email: "miyumiyu1278@gmail.com",
    gymRoles: { tsuzukiContact: "ベリー", sposenRep: "オレンジ", threeDistrictContact: "チャリチャリ", otherRep: "十日市場BB/白山さくらB/長" },
    postCode: "224-0036",
    address: "都筑区勝田南1-1-31",
    phone: "090-5855-5205",
    age: 54,
    birthday: "1971/12",
    joinedDate: "2006/1",
    hamakkoExpiry: "2026/1/31",
    membershipType: "official"
  },
  {
    id: 7,
    name: "上前 祥子",
    jbaId: "1400323419",
    refereeYear: "2025",
    email: "hsstuesmae@gmail.com",
    gymRoles: { tsuzukiRep: "セカンドゲーム", tsuzukiContact: "ポプラ?", sposenMember: "ベリー", otherContact: "白山（さくらB）" },
    postCode: "224-0006",
    address: "都筑区荏田東1-23-5",
    phone: "090-5812-9048",
    age: 60,
    birthday: "1966/2",
    joinedDate: "2007/4",
    hamakkoExpiry: "2026/12/31",
    membershipType: "official"
  },
  {
    id: 8,
    role: "代表",
    name: "上杉 由華",
    jbaId: "1100485431",
    refereeYear: "2027",
    email: "yuka-uesugi@b-w-c.jp",
    gymRoles: { tsuzukiRep: "X", tsuzukiContact: "ポプラ", sposenRep: "オレンジ", sposenMember: "ベリー", threeDistrictRep: "X", otherRep: "青葉4地区" },
    postCode: "225-0024",
    address: "青葉区市ヶ尾1055-1",
    phone: "090-8496-3499",
    age: 51,
    birthday: "1974/9/9",
    joinedDate: "2010/6",
    hamakkoExpiry: "2026/1/31",
    membershipType: "official"
  },
  {
    id: 9,
    name: "山本 優美子",
    jbaId: "1500328425",
    refereeYear: "2026",
    email: "ara.taku.171617@gmail.com",
    gymRoles: { tsuzukiRep: "さくら", sposenMember: "レグルス", threeDistrictRep: "さくらB" },
    postCode: "224-0035",
    address: "都筑区仲町台4-27-2-1",
    phone: "080-3455-1007",
    age: 63,
    birthday: "1962/6/1",
    joinedDate: "2010/12",
    hamakkoExpiry: "2028/5/31",
    membershipType: "official"
  },
  {
    id: 10,
    name: "柳川 加奈子",
    jbaId: "1000485432",
    refereeYear: "2027",
    email: "imakana193cm@gmail.com",
    gymRoles: { tsuzukiRep: "X", sposenMember: "BB", threeDistrictRep: "X" },
    postCode: "224-0029",
    address: "都筑区南山田1-3-8",
    phone: "090-4044-3930",
    age: 47,
    birthday: "1979/2/22",
    joinedDate: "2014/11",
    hamakkoExpiry: "2028/8/31",
    membershipType: "official"
  },
  {
    id: 11,
    role: "部長代代表",
    name: "藤田 美奈子",
    jbaId: "1700602221",
    refereeYear: "2026",
    email: "fuji.mina726@gmail.com",
    gymRoles: { sposenMember: "BB・レグルス" },
    postCode: "224-0066",
    address: "都筑区葛が谷19-3-708",
    phone: "090-5968-4563",
    age: 55,
    birthday: "1970/7/2",
    joinedDate: "2014/12",
    hamakkoExpiry: "2028/5/31",
    membershipType: "official"
  },
  {
    id: 12,
    name: "石井 香織",
    email: "101yokohamaaa@gmail.com",
    gymRoles: { tsuzukiRep: "X", sposenMember: "オレンジ" },
    postCode: "224-0034",
    address: "都筑区中川1-15-8-5",
    phone: "070-4409-3835",
    age: 53,
    birthday: "1973/3/2",
    joinedDate: "2019/7",
    hamakkoExpiry: "2026/1/31",
    membershipType: "official"
  },
  {
    id: 13,
    role: "体育館",
    name: "戸越 美咲",
    email: "kenkou1ichiban@gmail.com",
    gymRoles: { sposenMember: "ベリー", threeDistrictRep: "タルト代", threeDistrictContact: "トリプルス" },
    postCode: "226-0003",
    address: "緑区東本郷1-24-13",
    phone: "090-4053-4093",
    age: 47,
    birthday: "1978/8/7",
    joinedDate: "2019/9",
    hamakkoExpiry: "2028/2/28",
    membershipType: "official"
  },
  {
    id: 14,
    name: "原田 麻美",
    email: "kurimarimo55@gmail.com",
    gymRoles: { sposenMember: "レグルス", threeDistrictRep: "トリプルス" },
    postCode: "224-0033",
    address: "都筑区茅ヶ崎南3-14-0",
    phone: "080-6651-0754",
    age: 52,
    birthday: "1974/1/1",
    joinedDate: "2019/10",
    hamakkoExpiry: "2028/5/31",
    membershipType: "official"
  },
  {
    id: 15,
    name: "富岡 智子",
    jbaId: "1001252415",
    refereeYear: "2027",
    email: "ttoommookkoo1229@gmail.com",
    gymRoles: { tsuzukiRep: "X", sposenRep: "オレンジ", threeDistrictRep: "タルト", otherContact: "小机BB" },
    postCode: "225-0011",
    address: "青葉区あざみ野1-4-10",
    phone: "090-9809-3045",
    age: 46,
    birthday: "1979/12",
    joinedDate: "2019/11",
    hamakkoExpiry: "2026/1/31",
    membershipType: "official"
  },
  {
    id: 16,
    name: "石川 由美",
    email: "ayura.i.720@gmail.com",
    gymRoles: {},
    postCode: "213-0013",
    address: "川崎市高津区末長4-4",
    phone: "090-5502-6652",
    age: 49,
    birthday: "1976/7/11",
    joinedDate: "2025/7",
    membershipType: "official"
  },
  {
    id: 17,
    name: "中野 ひろみ",
    email: "hiro.hiro7.love9151103@gmail.com",
    gymRoles: {},
    postCode: "182-0024",
    address: "東京都調布市多摩川1-11-7-206",
    phone: "080-9151-1103",
    joinedDate: "2026/2",
    membershipType: "official"
  },
  {
    id: 18,
    name: "富永 真美",
    joinedDate: "2026/2",
    membershipType: "official"
  },
  {
    id: 19,
    name: "西島 恵",
    email: "nishijimamegumi74@gmail.com",
    gymRoles: {},
    postCode: "216-0035",
    address: "川崎市宮前区馬絹4-1-10",
    phone: "090-5552-6257",
    age: 53,
    birthday: "1973/1/1",
    joinedDate: "2026/2",
    membershipType: "official"
  },
  {
    id: 99,
    role: "コーチ",
    name: "渡辺 亜衣",
    email: "watanabe_coach@example.com",
    gymRoles: {},
    postCode: "",
    address: "",
    phone: "",
    membershipType: "coach"
  }
];
