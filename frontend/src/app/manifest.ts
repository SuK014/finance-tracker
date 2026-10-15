import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NgernTong",
    short_name: "NgernTong",
    description: "Personal finance tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fc",
    theme_color: "#6a5ae0",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
