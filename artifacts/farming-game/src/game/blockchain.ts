// BLOCKCHAIN CONFIGURATION & ALCHEMY INTEGRATION
// Using standard JSON-RPC to avoid heavy SDK dependencies

export const BLOCKCHAIN_CONFIG = {
  ALCHEMY_API_KEY: import.meta.env?.VITE_ALCHEMY_API_KEY || "JiVbTwHnF3qEGfs5AtgKR",
  TOKEN_MINT: import.meta.env?.VITE_TOKEN_MINT_ADDRESS || "CG8dh8s8P8y7seC3hB9QWuoBX81ug8MvfZK9s9WjaQFT", // Lifetopia Gold
  SOLANA_RPC: `https://solana-mainnet.g.alchemy.com/v2/${import.meta.env?.VITE_ALCHEMY_API_KEY || "JiVbTwHnF3qEGfs5AtgKR"}`,
};

export interface TokenBalanceResponse {
  jsonrpc: string;
  result: {
    value: Array<{
      account: {
        data: {
          parsed: {
            info: {
              tokenAmount: {
                uiAmount: number;
              };
            };
          };
        };
      };
    }>;
  };
}

/**
 * Fetches the Lifetopia Gold (LFG) balance for a given wallet address.
 * Uses Alchemy's Solana RPC endpoint.
 */
export async function fetchTokenBalance(walletAddress: string): Promise<number> {
  if (!walletAddress || walletAddress.length < 32) return 0;

  try {
    const response = await fetch(BLOCKCHAIN_CONFIG.SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-token-balance",
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          { mint: BLOCKCHAIN_CONFIG.TOKEN_MINT },
          { encoding: "jsonParsed" },
        ],
      }),
    });

    if (!response.ok) {
       const txt = await response.text();
       throw new Error(`RPC ERROR: ${response.status} ${txt.slice(0, 30)}`);
    }
    const data: TokenBalanceResponse = await response.json();
    
    if (data.result && data.result.value && data.result.value.length > 0 && data.result.value[0]?.account?.data?.parsed?.info?.tokenAmount) {
      // Return the first account's balance (usually only one ATA per mint)
      return data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
    }
  } catch (error) {
    console.error("Failed to fetch Lifetopia Gold balance:", error);
  }

  return 0;
}
