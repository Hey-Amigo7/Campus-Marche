import { ImageResponse } from "next/og";
import { CampusIconJsx } from "@/components/pwa-icon-jsx";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    // 20% padding on each side so content sits in the safe zone for maskable icons
    <CampusIconJsx size={512} pad={Math.round(512 * 0.1)} />,
    { width: 512, height: 512 },
  );
}
