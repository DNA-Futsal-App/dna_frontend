import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DNA Futsal",
    short_name: "DNA Futsal",
    description: "Acompanhe o futsal de base paulista.",
    start_url: "/app",
    display: "standalone",
    background_color: "#071112",
    theme_color: "#071112",
    icons: [{ src: "/dna-futsal-logo.webp", sizes: "480x480", type: "image/webp" }],
  };
}
