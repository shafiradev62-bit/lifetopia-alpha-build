import { supabase } from "./supabase";

export type WalletAuthProof = {
  address: string;
  chain: "solana" | "evm";
  message: string;
  signature: string;
  issuedAt: number;
};

const NONCE_KEY = "wallet_auth_nonce";

function buildLoginMessage(address: string, nonce: string): string {
  return [
    "Lifetopia Farm — session proof",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    "Signing proves wallet control for Supabase session binding.",
  ].join("\n");
}

/** Phantom / Solana-compatible signMessage */
export async function signSolanaLogin(
  sol: any,
  address: string,
): Promise<WalletAuthProof> {
  const nonce =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  sessionStorage.setItem(NONCE_KEY, nonce);
  const message = buildLoginMessage(address, nonce);
  const enc = new TextEncoder().encode(message);
  let signature: string;
  if (typeof sol.signMessage === "function") {
    const out = await sol.signMessage(enc, "utf8");
    if (typeof out?.signature === "string") signature = out.signature;
    else {
      const raw = out.signature as Uint8Array;
      let bin = "";
      raw.forEach((b) => {
        bin += String.fromCharCode(b);
      });
      signature = btoa(bin);
    }
  } else {
    throw new Error("Solana wallet has no signMessage");
  }
  return {
    address,
    chain: "solana",
    message,
    signature,
    issuedAt: Date.now(),
  };
}

/** MetaMask / eth_signTypedData or personal_sign */
export async function signEvmLogin(
  provider: any,
  address: string,
): Promise<WalletAuthProof> {
  const nonce =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  sessionStorage.setItem(NONCE_KEY, nonce);
  const message = buildLoginMessage(address, nonce);
  const sig = await provider.request({
    method: "personal_sign",
    params: [message, address],
  });
  return {
    address,
    chain: "evm",
    message,
    signature: sig as string,
    issuedAt: Date.now(),
  };
}

/**
 * Bind proof to Supabase: calls Edge Function `wallet-verify` if deployed.
 * Without backend, stores proof locally (auth.uid still anon — upgrade path).
 */
export async function verifyWalletWithSupabase(
  proof: WalletAuthProof,
): Promise<{ mode: "session" | "local"; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("wallet-verify", {
      body: proof,
    });
    if (!error && data?.access_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? "",
      });
      return { mode: "session" };
    }
  } catch {
    /* no edge function */
  }
  try {
    localStorage.setItem(
      "wallet_auth_proof",
      JSON.stringify(proof),
    );
  } catch {
    /* storage blocked */
  }
  return { mode: "local", error: "wallet-verify not configured" };
}
