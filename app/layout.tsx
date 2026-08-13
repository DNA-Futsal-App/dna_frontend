import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DNA Futsal — A base joga aqui",
    template: "%s | DNA Futsal",
  },
  description: "Resultados, classificação, artilharia e notícias do futsal de base paulista em um só lugar.",
  applicationName: "DNA Futsal",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "DNA Futsal", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071112",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
