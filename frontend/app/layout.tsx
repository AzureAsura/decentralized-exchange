import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const LOGO_URL = "https://nirmala-finance.vercel.app/logo.svg";
const SITE_TITLE = "Nirmala Exchange";
const SITE_DESCRIPTION =
  "Swap tokens, add liquidity, and trade on Nirmala Exchange, a Uniswap V2 style constant product AMM DEX built with Foundry and live on BNB Smart Chain Testnet.";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_TITLE}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Nirmala Exchange",
    "DEX",
    "AMM",
    "DeFi",
    "BNB Smart Chain",
    "BSC Testnet",
    "swap",
    "liquidity",
    "crypto exchange",
  ],
  icons: {
    icon: LOGO_URL,
    shortcut: LOGO_URL,
    apple: LOGO_URL,
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_TITLE,
    type: "website",
    locale: "en_US",
    images: [{ url: LOGO_URL }],
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [LOGO_URL],
  },
};

export const viewport: Viewport = {
  themeColor: "#020817",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
        <Toaster
          theme="dark"
          toastOptions={{
            classNames: {
              toast: "card border-blue-500/20",
              title: "text-white",
              description: "text-gray-400",
            },
          }}
        />
        </body>
    </html>
  );
}
