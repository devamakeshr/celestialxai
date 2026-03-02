import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata:Metadata = {
  title: "CelestialXAI | Web3 AI Ecosystem",
  description:
    "CelestialXAI is a decentralized AI ecosystem powered by ALX Coin. Wallet login, DAO governance, and space-tech infrastructure.",
  keywords: ["CelestialXAI", "ALX Coin", "Web3 AI", "Blockchain AI"],
  openGraph: {
    title: "CelestialXAI",
    description: "Web3 AI Ecosystem Powered by ALX",
    url: "https://celestialxai.io",
    siteName: "CelestialXAI",
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
