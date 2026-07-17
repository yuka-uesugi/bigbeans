import type { MetadataRoute } from "next";

// 検索エンジンへの案内。会員用画面と重複ページは検索結果に載せない
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/visitor-hp"],
    },
    sitemap: "https://bigbeans.vercel.app/sitemap.xml",
  };
}
