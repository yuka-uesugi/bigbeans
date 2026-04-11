import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "テキストが提供されていません" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY が設定されていません。Vercelの環境変数で設定するか、開発環境の .env.local にキーを追加してください。" },
        { status: 500 }
      );
    }

    // Gemini API リクエスト構築
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
以下のテキストは、バドミントンチームの活動（練習、試合、役員会議など）における簡単なメモやスコアです。
この内容を、チームメンバーが見やすいようにレポート形式（Markdownの箇条書きや見出しを使用）にして整頓し、出力してください。
さらに、テキストから読み取れる課題や次回の目標があれば、一番下に「💡AI所見」として1〜2行で追加してください。

【対象テキスト】
${text}
`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error:", errText);
      return NextResponse.json({ error: "AI生成に失敗しました" }, { status: 500 });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return NextResponse.json({ error: "AIからの返答が空でした" }, { status: 500 });
    }

    // 元のテキストを上書きあるいは追記するために結果を返す
    return NextResponse.json({ result: generatedText });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "内部サーバーエラー" }, { status: 500 });
  }
}
