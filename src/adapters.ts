// Integration adapters. Each one carries the request/response shape of the real system it stands in
// for, and a mock implementation that fills that shape. Swapping the mock for the live call changes
// one function body, not the app. These shapes are drawn from public documentation and are a
// best-effort reading, not Razorpay's internal contracts.

/** CKYC search (CERSAI Central KYC Registry). Keyed by PAN; consent is mandatory and logged. */
export type CkycSearchRequest = { id_type: "PAN"; id_number_masked: string; consent: { given: true; at: string; purpose: "merchant_onboarding_kyc" } };
export type CkycSearchResponse =
  | { found: true; ckyc_id_masked: string; name_as_per_registry: string; kyc_type: "NORMAL" | "SIMPLIFIED" | "SMALL"; last_updated: string }
  | { found: false };

/** Bank account validation (penny drop). The response carries the account holder name the bank returns
 *  and a name-match score against the name submitted — the same shape Razorpay's own bank-validation API exposes. */
export type BankValidationRequest = { account_number_masked: string; ifsc: string; name_to_match: string; amount_paise: 100 };
export type BankValidationResponse =
  | { status: "completed"; account_status: "active"; registered_name: string; name_match: { score: number; result: "match" | "partial" | "no_match" }; utr: string }
  | { status: "failed"; error_code: "INVALID_ACCOUNT" | "ACCOUNT_CLOSED" | "BANK_UNAVAILABLE"; error_description: string };

/** Fee capture (the ₹199 + GST KYC processing fee). Only called after the pre-flight passes. */
export type FeeCaptureRequest = { amount_paise: number; currency: "INR"; purpose: "kyc_processing_fee"; preflight_pass_id: string };
export type FeeCaptureResponse = { payment_id: string; status: "captured"; amount_paise: number; captured_at: string };

export type Adapter = "mock" | "live";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();

export const ckycSearch = async (req: CkycSearchRequest, mode: Adapter, sim: { found: boolean; name: string }): Promise<CkycSearchResponse> => {
  if (mode === "live") throw new Error("CKYC search needs a registered KYC user agency; not available in this prototype.");
  await delay(900);
  return sim.found ? { found: true, ckyc_id_masked: "XXXXXXXXXX1234", name_as_per_registry: sim.name, kyc_type: "NORMAL", last_updated: "2025-03-14" } : { found: false };
};

export const bankValidate = async (req: BankValidationRequest, mode: Adapter, sim: { registered_name: string; score: number }): Promise<BankValidationResponse> => {
  if (mode === "live") throw new Error("Bank validation needs a payouts account; not available in this prototype.");
  await delay(700);
  const result = sim.score >= 0.85 ? "match" : sim.score >= 0.6 ? "partial" : "no_match";
  return { status: "completed", account_status: "active", registered_name: sim.registered_name, name_match: { score: sim.score, result }, utr: "SIMULATED000001" };
};

export const captureFee = async (req: FeeCaptureRequest, mode: Adapter): Promise<FeeCaptureResponse> => {
  if (mode === "live") throw new Error("Fee capture is not wired in this prototype.");
  await delay(400);
  return { payment_id: "pay_SIMULATED", status: "captured", amount_paise: req.amount_paise, captured_at: nowIso() };
};
