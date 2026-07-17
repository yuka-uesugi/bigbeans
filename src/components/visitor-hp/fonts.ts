import { Archivo } from "next/font/google";

// 訪問者向けHP専用フォント（英字の飾り見出し用）
export const archivo = Archivo({
  weight: ["600", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
