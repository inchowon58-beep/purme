import { NextRequest, NextResponse } from "next/server";

/**
 * 끝 슬래시 URL은 301/308로 보내지 않고 내부 rewrite만 한다.
 * Yeti 수집 요청이 Permanent redirect로 실패하는 것을 막기 위함.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
