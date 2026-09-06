import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Campus Marche",
    short_name: "Campus",
    description:
      "Buy, sell, and connect safely with Ho Technical University students and local vendors.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#223A6A",
    orientation: "portrait-primary",
    categories: ["shopping", "education", "social"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: "Browse listings",
        url: "/products",
        description: "Browse campus listings",
      },
      {
        name: "Sell something",
        url: "/sell",
        description: "Post a new listing",
      },
      {
        name: "My orders",
        url: "/orders",
        description: "View your orders",
      },
    ],
  };
}
