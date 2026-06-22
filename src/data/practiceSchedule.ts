import { CalendarEvent } from "@/components/calendar/CalendarGrid";

// ビジター詳細情報を含む拡張型
export interface DetailedRegistration {
  id: string;
  name: string;
  type: "member" | "visitor";
  rank?: "A" | "B" | "C";
  ageGroup?: string; // "30代", "40代" など
  teamName?: string;
  invitedBy?: string;
  comment?: string;
}

export interface PracticeEvent extends CalendarEvent {
  description?: string;
  registrations: DetailedRegistration[];
  responsibleTeam?: string; // BB, チャリチャリ, 等
}

export const practiceSchedule: Record<string, PracticeEvent[]> = {
  // 4月
  "2026-4-1": [
    {
      id: 101,
      title: "水曜練習 (白山)",
      type: "practice",
      time: "9:00-12:00",
      location: "白山",
      description: "※さくらBADO支払済",
      attendees: 0,
      total: 22,
      registrations: [],
      responsibleTeam: "さくらBADO"
    }
  ],
  "2026-4-8": [
    {
      id: 102,
      title: "水曜練習 (仲町台)",
      type: "practice",
      time: "12:00-15:00",
      location: "仲町台",
      description: "♡新入部員歓迎モーニングinよこはま物語 (9:30-11:30)",
      attendees: 4,
      total: 22,
      registrations: [
        { id: "v1", name: "鈴木庸子", type: "visitor", rank: "A", comment: "木曜会・上杉・練習相手", teamName: "木曜会" },
        { id: "v2", name: "石井B", type: "visitor", rank: "B", invitedBy: "石川" },
        { id: "v3", name: "杉村B", type: "visitor", rank: "B", invitedBy: "石川" },
        { id: "v4", name: "満沢B", type: "visitor", rank: "B", invitedBy: "石川", comment: "3人共ライト会員での加入意思あり" },
      ],
      responsibleTeam: "BB"
    }
  ],
  "2026-4-15": [
    {
      id: 103,
      title: "練習休み",
      type: "event",
      time: "-",
      location: "-",
      description: "2部予選会のため練習休み",
      attendees: 0,
      total: 0,
      registrations: []
    }
  ],
  "2026-4-22": [
    {
      id: 104,
      title: "水曜練習 (仲町台)",
      type: "practice",
      time: "12:00-15:00",
      location: "仲町台",
      attendees: 3,
      total: 22,
      registrations: [
        { id: "v5", name: "鬼丸美智子", type: "visitor", rank: "A", ageGroup: "50代", teamName: "フリー", comment: "未経験 (石川)" },
        { id: "v6", name: "杉村B", type: "visitor", rank: "B", invitedBy: "石川" },
        { id: "v7", name: "満沢B", type: "visitor", rank: "B", invitedBy: "石川" },
      ],
      responsibleTeam: "トリプルス"
    }
  ],
  "2026-4-29": [
    {
      id: 105,
      title: "水曜練習 (中川西)",
      type: "practice",
      time: "9:00-12:00",
      location: "中川西 (2面)",
      attendees: 1,
      total: 22,
      registrations: [
        { id: "v8", name: "柴草A", type: "visitor", rank: "A", teamName: "フリー", invitedBy: "山本" },
      ],
      responsibleTeam: "チャリチャリ"
    }
  ],
  // 5月
  "2026-5-6": [
    {
      id: 106,
      title: "水曜練習 (美しが丘西)",
      type: "practice",
      time: "9:00-12:00",
      location: "美しが丘西",
      description: "ラビットさんから譲ってもらいました",
      attendees: 0,
      total: 22,
      registrations: [],
      responsibleTeam: "ラビット"
    }
  ],
  "2026-5-13": [
    {
      id: 107,
      title: "水曜練習 (北山田)",
      type: "practice",
      time: "12:00-15:00",
      location: "北山田",
      description: "山口コーチ予定",
      attendees: 3,
      total: 22,
      registrations: [
        { id: "v9", name: "石井B", type: "visitor", rank: "B", invitedBy: "石川" },
        { id: "v10", name: "杉村B", type: "visitor", rank: "B", invitedBy: "石川" },
        { id: "v11", name: "満沢B", type: "visitor", rank: "B", invitedBy: "石川" },
      ],
      responsibleTeam: "BB"
    }
  ],
  "2026-5-18": [
    {
      id: 109,
      title: "【団体戦】ビッグビーンズ(A-1)",
      type: "match",
      time: "終日",
      location: "ひらつかサン・ライフアリーナ",
      description: "団体戦 A-1",
      attendees: 0,
      total: 22,
      registrations: [],
    }
  ],
  "2026-5-20": [
    {
      id: 108,
      title: "水曜練習 (中川西)",
      type: "practice",
      time: "12:00-15:00",
      location: "中川西",
      description: "ブルーラビットさんから譲ってもらいました",
      attendees: 0,
      total: 22,
      registrations: [],
      responsibleTeam: "ブルーラビット"
    }
  ],
  "2026-5-29": [
    {
      id: 110,
      title: "【個人戦・久子杯】上前・黒岩・山本・関水",
      type: "match",
      time: "終日",
      location: "大和スポーツセンター",
      description: "個人戦・久子杯 出場：上前・黒岩・山本・関水",
      attendees: 4,
      total: 22,
      registrations: [],
    }
  ],
  // 6月
  "2026-6-3": [
    {
      id: 112,
      title: "練習",
      type: "practice",
      time: "09:00-12:00",
      location: "白山地区センター",
      description: "※さくらBAD",
      attendees: 0,
      total: 22,
      registrations: [],
    }
  ],
  "2026-6-10": [
    {
      id: 111,
      title: "【団体戦】ビッグビーンズ(A-2)",
      type: "match",
      time: "終日",
      location: "ひらつかサン・ライフアリーナ",
      description: "団体戦 A-2",
      attendees: 0,
      total: 22,
      registrations: [],
    },
    {
      id: 113,
      title: "練習",
      type: "practice",
      time: "12:00-15:00",
      location: "美しが丘西地区センター",
      description: "※アコナリアル",
      attendees: 0,
      total: 22,
      registrations: [],
    }
  ],
  "2026-6-17": [
    {
      id: 114,
      title: "練習",
      type: "practice",
      time: "12:00-15:00",
      location: "中山地区センター",
      description: "※BB",
      attendees: 0,
      total: 22,
      registrations: [],
    }
  ],
  "2026-6-24": [
    {
      id: 115,
      title: "練習",
      type: "practice",
      time: "12:00-15:00",
      location: "北山田地区センター",
      description: "※ナイスショット",
      attendees: 0,
      total: 22,
      registrations: [],
    }
  ],
  // 8月
  "2026-8-5": [
    {
      id: 116,
      title: "練習",
      type: "practice",
      time: "9:00-12:00",
      location: "白山地区センター",
      description: "※ウィップさんから譲っていただきました 支払い済",
      attendees: 0,
      total: 22,
      registrations: [],
      responsibleTeam: "ウィップ"
    }
  ],
  "2026-8-12": [
    {
      id: 117,
      title: "練習",
      type: "practice",
      time: "12:00-15:00",
      location: "中川西",
      description: "※ブルーラビット ラビットさんから譲ってもらいました",
      attendees: 0,
      total: 22,
      registrations: [],
      responsibleTeam: "ブルーラビット"
    }
  ],
  "2026-8-19": [
    {
      id: 118,
      title: "練習",
      type: "practice",
      time: "12:00-15:00",
      location: "仲町台",
      description: "※タルト",
      attendees: 0,
      total: 22,
      registrations: [],
      responsibleTeam: "タルト"
    }
  ],
  "2026-8-26": [
    {
      id: 119,
      title: "練習",
      type: "practice",
      time: "12:00-15:00",
      location: "美しが丘西",
      description: "※アフター 駐車場2台 ナイスショットさんより譲っていただきました",
      attendees: 0,
      total: 22,
      registrations: [],
      responsibleTeam: "アフター"
    }
  ],
  // 9月
  "2026-9-28": [
    {
      id: 120,
      title: "【横浜市個人戦】上前・藤田",
      type: "match",
      time: "12:30-17:00",
      location: "磯子スポーツセンター",
      description: "午後の部 12:30受付 / 出場：上前・藤田",
      attendees: 2,
      total: 22,
      registrations: [],
    }
  ],
  // 10月
  "2026-10-3": [
    {
      id: 121,
      title: "【横浜市個人戦】石川・播川",
      type: "match",
      time: "12:30-17:00",
      location: "緑スポーツセンター",
      description: "午後の部 12:30受付 / 出場：石川・播川",
      attendees: 2,
      total: 22,
      registrations: [],
    }
  ],
  "2026-10-7": [
    {
      id: 122,
      title: "【横浜市個人戦】山本・石井",
      type: "match",
      time: "12:30-17:00",
      location: "南スポーツセンター",
      description: "午後の部 12:30受付 / 出場：山本・石井",
      attendees: 2,
      total: 22,
      registrations: [],
    }
  ],
  "2026-10-9": [
    {
      id: 123,
      title: "【横浜市個人戦】小川・五十嵐",
      type: "match",
      time: "08:45-12:30",
      location: "神奈川スポーツセンター",
      description: "午前の部 8:45受付 / 出場：小川・五十嵐",
      attendees: 2,
      total: 22,
      registrations: [],
    }
  ],
  "2026-10-10": [
    {
      id: 124,
      title: "【横浜市個人戦】伊藤・黒岩",
      type: "match",
      time: "12:30-17:00",
      location: "鶴見スポーツセンター",
      description: "午後の部 12:30受付 / 出場：伊藤・黒岩",
      attendees: 2,
      total: 22,
      registrations: [],
    }
  ],
  "2026-10-14": [
    {
      id: 125,
      title: "【横浜市個人戦】上杉・富岡",
      type: "match",
      time: "12:30-17:00",
      location: "平沼記念体育館",
      description: "午後の部 12:30受付 / 出場：上杉・富岡",
      attendees: 2,
      total: 22,
      registrations: [],
    }
  ]
};
