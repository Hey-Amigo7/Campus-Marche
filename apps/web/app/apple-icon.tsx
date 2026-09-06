import { ImageResponse } from "next/og";
import { CampusIconJsx } from "@/components/pwa-icon-jsx";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<CampusIconJsx size={180} />, {
    width: 180,
    height: 180,
  });
}
