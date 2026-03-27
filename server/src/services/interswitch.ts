import axios from "axios";
import crypto from "crypto";

/** Default timeout for all Interswitch API calls (15 seconds). */
const API_TIMEOUT_MS = 15_000;

// Collections / payments base  (e.g. https://qa.interswitchng.com)
const BASE_URL = process.env.INTERSWITCH_BASE_URL!;
// Passport OAuth host — lives on a separate subdomain from the rest of the API
const PASSPORT_URL =
  process.env.INTERSWITCH_PASSPORT_BASE_URL ??
  "https://apps.qa.interswitchng.com";
// Merchant Wallet API — completely separate host from collections
const WALLET_BASE_URL =
  process.env.INTERSWITCH_WALLET_BASE_URL ??
  "https://merchant-wallet.k8.isw.la/merchant-wallet";

const CLIENT_ID = process.env.INTERSWITCH_CLIENT_ID!;
const CLIENT_SECRET = process.env.INTERSWITCH_SECRET!;
const MERCHANT_CODE = process.env.INTERSWITCH_MERCHANT_CODE!;
// Issued separately from the OAuth flow — used only for the virtual account callback endpoint.
const CALLBACK_TOKEN = process.env.INTERSWITCH_CALLBACK_TOKEN!;

// Simple in-memory token cache — avoids fetching a new token on every request
let tokenCache: { value: string; expiresAt: number } | null = null;

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
    "base64",
  );

  const { data } = await axios.post(
    `${PASSPORT_URL}/passport/oauth/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: API_TIMEOUT_MS,
    },
  );

  // Refresh 60s before actual expiry to avoid using a just-expired token
  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return tokenCache.value;
}

export interface WalletVirtualAccount {
  id: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  accountPayableCode: string;
  currencyCode: string;
}

export interface CreateWalletResult {
  walletId: string;
  virtualAccount?: WalletVirtualAccount;
}

/**
 * Creates a Merchant Wallet (QTB) for a pod.
 * Returns walletId and virtualAccount details (Wema Bank account for fund transfers).
 * virtualAccount is only present in the creation response — it is NOT returned by
 * subsequent wallet detail or balance calls, so callers must persist it.
 *
 * Wallet credentials are per-pod/per-creator — not global env vars.
 */
export async function createWallet(options: {
  podName: string;
  creatorPhone: string;
  creatorFirstName: string;
  creatorEmail: string;
  pin: string;
}): Promise<CreateWalletResult> {
  const token = await getAccessToken();

  const { data } = await axios.post(
    `${WALLET_BASE_URL}/api/v1/wallet`,
    {
      name: options.podName,
      merchantCode: MERCHANT_CODE,
      status: "ACTIVE",
      mobileNo: options.creatorPhone,
      provider: "PRIME",
      firstName: options.creatorFirstName,
      pin: options.pin,
      email: options.creatorEmail,
    },
    { headers: authHeaders(token), timeout: API_TIMEOUT_MS },
  );

  const payload = data.data ?? data;
  const walletId = payload.walletId;
  if (!walletId) throw new Error("Interswitch did not return a walletId");

  const va = payload.virtualAccount;
  const virtualAccount: WalletVirtualAccount | undefined = va
    ? {
        id: va.id,
        accountName: va.accountName,
        accountNumber: va.accountNumber,
        bankName: va.bankName,
        bankCode: va.bankCode,
        accountPayableCode: va.accountPayableCode,
        currencyCode: va.currencyCode,
      }
    : undefined;

  return { walletId, virtualAccount };
}

/**
 * Returns the current balance of a merchant wallet in Naira.
 * This endpoint does not require authentication.
 */
export async function getWalletBalance(walletId: string): Promise<number> {
  const token = await getAccessToken();
  const { data } = await axios.get(
    `${WALLET_BASE_URL}/api/v1/wallet/balance/${MERCHANT_CODE}?walletId=${walletId}`,
    { headers: authHeaders(token), timeout: API_TIMEOUT_MS },
  );

  // availableBalance is in Naira for the Merchant Wallet API
  return data.availableBalance ?? data.ledgerBalance ?? 0;
}

/**
 * Debits a pod's merchant wallet via the Merchant Wallet transact endpoint.
 * Amount is in Naira (passed as a string to the API).
 * The pin must match the PIN set when the wallet was created.
 * Uses the same OAuth Bearer token as wallet creation / balance checks.
 */
export async function disburseFunds(
  walletId: string,
  amount: number,
  reference: string,
  pin: string,
  narration?: string,
): Promise<void> {
  const token = await getAccessToken();

  await axios.post(
    `${WALLET_BASE_URL}/api/v1/transaction/transact`,
    {
      walletId,
      amount: String(amount),
      pin,
      reference,
      transactionCode: "api-charge",
      narration: narration ?? `AjoFlow payout ${reference}`,
    },
    { headers: authHeaders(token), timeout: API_TIMEOUT_MS },
  );
}

/**
 * Simulates a bank-transfer credit to a pod's virtual account via the Interswitch
 * Wema virtual account callback endpoint. This is the only confirmed way to fund
 * the merchant wallet in the sandbox environment.
 *
 * @param accountName    pod.virtualAccount.accountName  → craccountname
 * @param accountNumber  pod.virtualAccount.accountNumber → craccount
 * @param amountNaira    contribution amount in Naira
 * @param ref            optional reference; auto-generated if omitted
 */
export async function creditWalletViaCallback(
  accountName: string,
  accountNumber: string,
  amountNaira: number,
  ref?: string,
): Promise<string> {
  const paymentReference =
    ref ?? `AJO-CB-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  await axios.post(
    `${BASE_URL}/paymentgateway/api/v1/virtualaccounts/wema/callback`,
    {
      originatoraccountnumber: "0011112345",
      amount: String(amountNaira),
      originatorname: "TEST ACCOUNT",
      service: "0001065791829276962",
      narration: `AjoFlow contribution ${paymentReference}`,
      craccountname: accountName,
      paymentreference: paymentReference,
      sessionid: paymentReference,
      bankname: "Access Bank",
      craccount: accountNumber,
      bankcode: "000014",
    },
    { headers: authHeaders(CALLBACK_TOKEN), timeout: API_TIMEOUT_MS },
  );

  return paymentReference;
}

/**
 * Re-queries a transaction's status by reference via the Merchant Wallet API.
 * Use this to verify final settlement status when a `disburseFunds` call
 * times out or returns an ambiguous error.
 *
 * Returns the raw transaction data from Interswitch including status fields.
 */
export async function requeryTransaction(
  reference: string,
): Promise<{ status: string; amount?: number; [key: string]: unknown }> {
  const token = await getAccessToken();

  const { data } = await axios.get(
    `${WALLET_BASE_URL}/api/v1/transaction/${encodeURIComponent(reference)}`,
    { headers: authHeaders(token), timeout: API_TIMEOUT_MS },
  );

  return data.data ?? data;
}

/**
 * Generates a collision-safe unique reference for a transaction.
 * Format: {prefix}-{podId suffix}-{timestamp}-{UUID fragment}
 */
export function generateReference(prefix: string, podId: string): string {
  return `${prefix}-${podId.slice(-6)}-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

