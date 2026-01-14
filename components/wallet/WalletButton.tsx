"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function WalletButton({ className }: { className?: string }) {
  return <WalletMultiButton className={className} />;
}
