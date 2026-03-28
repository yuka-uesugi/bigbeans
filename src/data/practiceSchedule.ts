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
  ]
};
