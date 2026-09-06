import crypto from "crypto";
import jazzcashConfig from "../config/jazzcash.js";

/**
 * ==========================================
 * JAZZCASH PAYMENT SERVICE
 * ==========================================
 * Integrates JazzCash Payment Gateway.
 * Flow:
 *  1. Build signed POST payload and submit to gateway via HTML auto-post
 *     (or redirect). We return the form fields + gateway URL so the
 *     frontend can submit the form (standard JazzCash integration).
 *  2. Gateway redirects back to ReturnURL with PP_ResponseCode +
 *     PP_TxnRefNo. Validate with official integrity check before
 *     considering payment successful.
 */

const padLeft = (value, length = 6, padChar = "0") =>
  String(value).padStart(length, padChar);

/**
 * JazzCash requires the DateTime (YYYYMMDDHHmmss) and an
 * order expiry (max 1 hour later).
 */
const jazzCashDateTime = (date = new Date()) => {
  const pad = (n) => padLeft(n, 2);
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
};

const jazzCashExpiry = (minutes = 60) => {
  const expiry = new Date(Date.now() + minutes * 60 * 1000);
  return jazzCashDateTime(expiry);
};

/**
 * Official JazzCash integrity hash builder.
 * Concatenates the following fields (in order), then HMAC-SHA256
 * with the Integrity Salt.
 */
export const buildJazzCashIntegrity = ({ salesId, amount, currency, merchantId }) => {
  const str = `${merchantId}&${salesId}&${amount}&${currency}`;
  return crypto
    .createHmac("sha256", jazzcashConfig.integritySalt)
    .update(str)
    .digest("hex");
};

/**
 * Build the complete set of form fields needed to POST to JazzCash.
 * null values mean the field is omitted per gateway rules.
 */
export const createJazzCashCheckout = async ({
  orderId,
  amount, // in PKR
  email,
  mobileNumber,
  customerName,
  successUrl,
  cancelUrl,
  paymentId = "",
}) => {
  const pp_TxnDateTime = jazzCashDateTime();
  const pp_TxnExpiryDateTime = jazzCashExpiry(60);
  const pp_SalesID = `JC_${String(orderId).slice(0,20)}_${paymentId ? String(paymentId).slice(-8) : crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const pp_Amount = Math.round(amount * 100); // JazzCash amount in paisa
  const pp_MerchantID = jazzcashConfig.merchantId;
  const pp_CurrencyCode = jazzcashConfig.currency;
  const pp_Version = jazzcashConfig.version;
  const pp_Language = jazzcashConfig.language;

  const pp_SecureHash = buildJazzCashIntegrity({
    merchantId: pp_MerchantID,
    salesId: pp_SalesID,
    amount: pp_Amount,
    currency: pp_CurrencyCode,
  });

  const formFields = {
    pp_Version,
    pp_TxnType: "MWALLET", // Mobile wallet
    pp_Language,
    pp_MerchantID,
    pp_SubMerchantID: "",
    pp_Password: "",
    pp_BankID: "",
    pp_ProductID: "",
    pp_TxnRefNo: "",
    pp_Amount,
    pp_TxnCurrency: pp_CurrencyCode,
    pp_TxnDateTime,
    pp_BillReference: pp_SalesID,
    pp_Description: `Payment ${orderId}`.slice(0, 32),
    pp_TxnExpiryDateTime,
    pp_ReturnURL: successUrl || `${jazzcashConfig.websiteUrl}/payment-success`,
    pp_SecureHash,
    ppmpf_1: email || "",
    ppmpf_2: mobileNumber || "",
    ppmpf_3: customerName || "",
    ppmpf_4: pp_SalesID,
    ppmpf_5: "",
  };

  // Remove empty optional fields
  for (const key of [
    "pp_SubMerchantID",
    "pp_Password",
    "pp_BankID",
    "pp_ProductID",
    "pp_TxnRefNo",
    "ppmpf_5",
  ]) {
    if (formFields[key] === "") delete formFields[key];
  }

  const gatewayUrl = `${jazzcashConfig.baseUrl}/ApplicationAPI/2.0/Purchase/Index`;

  return {
    gatewayUrl,
    formFields,
    secureHash: pp_SecureHash,
    transactionId: pp_SalesID,
  };
};

/**
 * Validate JazzCash confirmation (from ReturnURL query params).
 * Recomputes the secure hash from the returned transaction ref &
 * compares to the pp_SecureHash that came back.
 */
export const verifyJazzCashPayment = (returnData) => {
  const {
    pp_MerchantID,
    pp_Amount,
    pp_TxnRefNo,
    pp_SecureHash,
    pp_ResponseCode = "",
  } = returnData || {};

  const currency = returnData?.pp_TxnCurrency || jazzcashConfig.currency;

  // Recompute expected hash
  const expectedHash = pp_TxnRefNo
    ? crypto
        .createHmac("sha256", jazzcashConfig.integritySalt)
        .update(`${pp_MerchantID}&${pp_TxnRefNo}&${pp_Amount}&${currency}`)
        .digest("hex")
    : "";

  let hashValid = false;
  if (expectedHash && typeof pp_SecureHash === "string" && /^[a-f0-9]{64}$/i.test(pp_SecureHash)) {
    const a=Buffer.from(expectedHash,"hex"); const b=Buffer.from(pp_SecureHash,"hex");
    hashValid=a.length===b.length && crypto.timingSafeEqual(a,b);
  }
  const returnedAmount=Number(pp_Amount);
  const approved=pp_ResponseCode==="000" && Boolean(hashValid) && Number.isFinite(returnedAmount) && returnedAmount>0;

  return {
    approved,
    hashValid: Boolean(hashValid),
    responseCode: pp_ResponseCode,
    transactionRef: pp_TxnRefNo || "",
    amount: pp_Amount,
    merchantId: pp_MerchantID,
    currency,
    raw: returnData,
  };
};


