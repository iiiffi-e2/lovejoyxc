import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lovejoy XC Log",
    short_name: "Lovejoy XC",
    description:
      "Private team running log for the Lovejoy Leopards cross country team.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#c8102e",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
