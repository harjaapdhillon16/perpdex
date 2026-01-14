import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import WalletProvider from "@/components/wallet/WalletProvider";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  weight: ["400", "500", "600", "700"]
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: "Perpdex",
  description: "Non-custodial oracle perps with chat-native execution."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} ${plexMono.variable} font-sans text-ink`}>
        <WalletProvider>
          <div className="min-h-screen noise">{children}</div>
        </WalletProvider>
      </body>
    </html>
  );
}
