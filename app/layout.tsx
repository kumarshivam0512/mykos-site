import type { Metadata } from "next";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "Mykos — AI ad creatives that ship themselves",
  description:
    "Mykos turns a one-line brief into video ads ready to run on Meta, TikTok, Google, and LinkedIn — generated, tested, and live in minutes.",
  metadataBase: new URL("https://mykos.ai"),
  openGraph: {
    title: "Mykos — AI ad creatives that ship themselves",
    description:
      "From brief to live ad in minutes. Mykos generates, tests, and runs video ads across every major platform.",
    url: "https://mykos.ai",
    siteName: "Mykos",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mykos — AI ad creatives that ship themselves",
    description:
      "From brief to live ad in minutes. Mykos generates, tests, and runs video ads across every major platform.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="relative z-0">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
