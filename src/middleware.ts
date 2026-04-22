import { NextRequest, NextResponse } from "next/server";

const VISITOR_ALLOWED_PATHS = ["/dashboard", "/dashboard/calendar"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isVisitor = request.nextUrl.searchParams.get("role") === "visitor";

  // ビジターモードで許可されたパスは通過
  if (isVisitor && VISITOR_ALLOWED_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // セッションクッキーがなければビジターLP（入会案内付き）へリダイレクト
  const session = request.cookies.get("bb_session");
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "?blocked=member-only";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
