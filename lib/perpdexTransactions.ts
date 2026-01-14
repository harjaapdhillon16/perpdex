//@ts-nocheck

import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction
} from "@solana/web3.js";

import { AnchorWallet, getPerpdexProgram } from "@/lib/anchorProgram";
import {
  getCollateralVaultPda,
  getMarketPda,
  getPositionPda,
  getVaultPda,
  MarketSymbol,
  ORACLE_FEEDS
} from "@/lib/perpdex";

const LAMPORTS_PER_SOL = 1_000_000_000;

type OpenPositionPayload = {
  market: MarketSymbol;
  side: "long" | "short";
  leverage: number;
  marginSol: number;
};

type ClosePositionPayload = {
  market: MarketSymbol;
};

function normalizeCollateralMint(vaultAccount: Record<string, unknown>) {
  const mint = vaultAccount.collateralMint ?? vaultAccount.collateral_mint;
  if (mint instanceof PublicKey) {
    return mint;
  }
  throw new Error("Collateral mint not found");
}

export async function buildOpenPositionTransaction(
  connection: Connection,
  wallet: AnchorWallet,
  payload: OpenPositionPayload
) {
  const program = getPerpdexProgram(connection, wallet);
  const oracle = ORACLE_FEEDS[payload.market];
  if (!oracle) {
    throw new Error("Unsupported market");
  }

  const [marketPda] = getMarketPda(oracle);
  const [vaultPda] = getVaultPda(marketPda);
  const [collateralVaultPda] = getCollateralVaultPda(marketPda);
  const [positionPda] = getPositionPda(marketPda, wallet.publicKey);

  const vaultAccount = (await program.account.vault.fetch(vaultPda)) as Record<string, unknown>;
  const collateralMint = normalizeCollateralMint(vaultAccount);
  const userCollateral = getAssociatedTokenAddressSync(collateralMint, wallet.publicKey);

  const marginLamports = Math.max(0, Math.round(payload.marginSol * LAMPORTS_PER_SOL));
  if (!marginLamports) {
    throw new Error("Margin must be greater than zero");
  }
  if (!payload.leverage || payload.leverage <= 0) {
    throw new Error("Leverage must be greater than zero");
  }
  const notionalLamports = Math.round(marginLamports * payload.leverage);
  if (!notionalLamports) {
    throw new Error("Notional must be greater than zero");
  }

  const instructions = [];
  const ataInfo = await connection.getAccountInfo(userCollateral);
  if (!ataInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userCollateral,
        wallet.publicKey,
        collateralMint
      )
    );
  }

  if (collateralMint.equals(NATIVE_MINT)) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: userCollateral,
        lamports: marginLamports
      }),
      createSyncNativeInstruction(userCollateral)
    );
  }

  const side = payload.side === "short" ? { short: {} } : { long: {} };
  const ix = await program.methods
    .openPosition({
      side,
      notional: new anchor.BN(notionalLamports),
      margin: new anchor.BN(marginLamports)
    })
    .accounts({
      user: wallet.publicKey,
      oracle,
      market: marketPda,
      vault: vaultPda,
      collateralVault: collateralVaultPda,
      userCollateral,
      position: positionPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY
    })
    .instruction();

  const transaction = new Transaction();
  transaction.add(...instructions, ix);
  return transaction;
}

export async function buildClosePositionTransaction(
  connection: Connection,
  wallet: AnchorWallet,
  payload: ClosePositionPayload
) {
  const program = getPerpdexProgram(connection, wallet);
  const oracle = ORACLE_FEEDS[payload.market];
  if (!oracle) {
    throw new Error("Unsupported market");
  }

  const [marketPda] = getMarketPda(oracle);
  const [vaultPda] = getVaultPda(marketPda);
  const [collateralVaultPda] = getCollateralVaultPda(marketPda);
  const [positionPda] = getPositionPda(marketPda, wallet.publicKey);

  const vaultAccount = (await program.account.vault.fetch(vaultPda)) as Record<string, unknown>;
  const collateralMint = normalizeCollateralMint(vaultAccount);
  const userCollateral = getAssociatedTokenAddressSync(collateralMint, wallet.publicKey);

  const instructions = [];
  const ataInfo = await connection.getAccountInfo(userCollateral);
  if (!ataInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userCollateral,
        wallet.publicKey,
        collateralMint
      )
    );
  }

  const ix = await program.methods
    .closePosition()
    .accounts({
      user: wallet.publicKey,
      oracle,
      market: marketPda,
      vault: vaultPda,
      collateralVault: collateralVaultPda,
      userCollateral,
      position: positionPda,
      tokenProgram: TOKEN_PROGRAM_ID
    })
    .instruction();

  const transaction = new Transaction();
  transaction.add(...instructions, ix);
  return transaction;
}
