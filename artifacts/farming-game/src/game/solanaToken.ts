// @ts-nocheck — remote ESM URLs resolved at build/runtime
import { Connection, PublicKey, Transaction } from 'https://esm.sh/@solana/web3.js@1.87.6';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from 'https://esm.sh/@solana/spl-token@0.3.9';

const ALCHEMY_KEY = import.meta.env?.VITE_ALCHEMY_API_KEY || "JiVbTwHnF3qEGfs5AtgKR";
const TOKEN_MINT  = import.meta.env?.VITE_TOKEN_MINT_ADDRESS || "CG8dh8s8P8y7seC3hB9QWuoBX81ug8MvfZK9s9WjaQFT";
const RPC_URL     = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const connection = new Connection(RPC_URL);

/**
 * Initializes the Associated Token Account (ATA) for the connected wallet.
 * This is a real transaction that will show up on Solscan.
 */
export async function initializeTokenAccount(): Promise<{ success: boolean; txid?: string; error?: string }> {
  try {
    const phantom = (window as any).phantom;
    const sol = (phantom && phantom.solana) ? phantom.solana : (window as any).solana;
    if (!sol || !sol.isPhantom) return { success: false, error: "Phantom not connected" };

    const walletAddress = sol.publicKey;
    const mint = new PublicKey(TOKEN_MINT);
    
    // Find ATA
    const ata = await getAssociatedTokenAddress(mint, walletAddress);
    
    // Build transaction
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        walletAddress, // Payer
        ata,           // ATA
        walletAddress, // Owner
        mint           // Mint
      )
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletAddress;

    const { signature } = await sol.signAndSendTransaction(transaction);
    return { success: true, txid: signature };
  } catch (e: any) {
    console.error("[Solana] Init ATA failed:", e);
    return { success: false, error: e.message || "Initialization failed" };
  }
}

export async function transferTokenToUser(toWallet: string, amount: number, decimals = 9): Promise<{ success: boolean; txid?: string; error?: string }> {
  try {
    const phantom = (window as any).phantom;
    const sol = (phantom && phantom.solana) ? phantom.solana : (window as any).solana;
    if (!sol || !sol.isPhantom) return { success: false, error: "Phantom not connected" };

    // This is a placeholder for a treasury transfer. 
    // Currently it just checks if the user has an ATA.
    const wallet = sol.publicKey;
    const mint = new PublicKey(TOKEN_MINT);
    const ata = await getAssociatedTokenAddress(mint, wallet);
    
    const info = await connection.getAccountInfo(ata);
    if (!info) {
      // If no ATA, suggest initialization
      return { success: false, error: "ACCOUNT NOT INITIALIZED. CLICK 'INITIALIZE' FIRST" };
    }

    return { success: false, error: "TREASURY WALLET NOT CONFIGURED FOR AUTO-CLAIM" };
  } catch (e: any) {
    return { success: false, error: e.message || "Transfer failed" };
  }
}

export async function getTokenBalance(wallet: string): Promise<number> {
  try {
    const pubkey = new PublicKey(wallet);
    const mint = new PublicKey(TOKEN_MINT);
    const ata = await getAssociatedTokenAddress(mint, pubkey);
    const balance = await connection.getTokenAccountBalance(ata);
    return balance.value.uiAmount || 0;
  } catch { return 0; }
}
