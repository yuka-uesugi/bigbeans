import type { MetadataRoute } from "next";

// 検索エンジンに「このサイトの公開ページはここです」と伝える地図
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://bigbeans.vercel.app/",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
