import { ImageResponse } from "next/og";
import { CampusIconJsx } from "@/components/pwa-icon-jsx";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<CampusIconJsx size={512} />, {
    width: 512,
    height: 512,
  });
}
