import { NextRequest, NextResponse } from "next/server";

// Route prefixes that unverified users are allowed to access
const UNVERIFIED_ALLOWED_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/verify-phone",
  "/forgot-password",
  "/reset-password",
  "/events",
  "/listings",
  "/sellers",
  "/admin",
  "/campus",
];

function isAllowedUnverified(pathname: string): boolean {
  if (pathname === "/") return true;
  return UNVERIFIED_ALLOWED_PREFIXES.some(
    (prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(prefix + "/")),
  );
}

function getVerifiedFromToken(token: string): boolean | undefined {
  try {
    const part = token.split(".")[1];
    if (!part) return undefined;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    const payload = JSON.parse(json) as Record<string, unknown>;
    // Old tokens without the field are treated as verified (grandfathered)
    if (!("verified" in payload)) return undefined;
    return payload.verified === true;
  } catch {
    return undefined;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("cm_token")?.value;
  if (!token) return NextResponse.next();

  const verified = getVerifiedFromToken(token);

  // Only block explicitly unverified users (verified === false)
  // undefined = old token without the claim = let them through
  if (verified === false && !isAllowedUnverified(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/verify-email";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)"],
};
