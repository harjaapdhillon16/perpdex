import * as anchor from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";

import idl from "@/lib/idl/perpdex.json";

export type AnchorWallet = {
  publicKey: anchor.web3.PublicKey;
  signTransaction: anchor.Wallet["signTransaction"];
  signAllTransactions: anchor.Wallet["signAllTransactions"];
};

export function getPerpdexProgram(connection: Connection, wallet: AnchorWallet) {
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed"
  });
  return new anchor.Program(idl as anchor.Idl, provider);
}
