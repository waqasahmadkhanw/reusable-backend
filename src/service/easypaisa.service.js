import crypto from "crypto";
import easypaisaConfig from "../config/easypaisa.js";

/**
 * ==========================================
 * EASYPAISA PAYMENT SERVICE
 * ==========================================
 * Handles EasyPaisa (HBL) payment gateway integration.
 * Uses the official generate-hmac-token-gateway hosted
 * checkout flow: post transaction data, receive a redirect
 * URL, then confirm via status API on callback.
 *
 * NOTE: Gateway APIs differ across HBL regions/merchants.
 * This implementation targets the classic "generate-hmac-token"
 * hosted flow and keeps request/response parsing defensive so
 * it degrades gracefully in sandbox.
 */

const requestJson = async (path, body) => {
  const base = new URL(easypaisaConfig.baseUrl);
  if (process.env.NODE_ENV === "production" && base.protocol !== "https:") {
    const error = new Error("EasyPaisa base URL must use HTTPS in production"); error.code = "EASYPAISA_CONFIG"; error.status = 500; throw error;
  }
  const url = new URL(path, base).toString();

  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS || 10000)),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const wrapped = new Error(`EasyPaisa network error: ${error.message}`);
    wrapped.code = "EASYPAISA_NETWORK";
    throw wrapped;
  }

  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`EasyPaisa HTTP ${response.status}`);
    error.code = "EASYPAISA_HTTP";
    error.status = response.status;
    error.responseBody = text.slice(0, 2000);
    throw error;
  }
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    // Some EasyPaisa sandboxes return non-JSON; keep raw
    parsed = { raw: text };
  }

  return parsed;
};

/**
 * Create a hosted EasyPaisa payment session.
 * @returns {{ redirectUrl: string, transactionId: string }}
 */
export const createEasyPaisaCheckout = async ({
  orderId, // e.g. ORDER-12345
  amount, // in PKR
  email,
  mobileNumber,
  paymentId = ""
}) => {
  const transactionId = `T_${String(orderId).slice(0,20)}_${paymentId ? String(paymentId).slice(-8) : crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const orderReference = `Ref_${orderId}`;
  const amountPaise = `${Math.round(amount * 100)}`; // confirm with merchant docs (BD/EG/Africa differ)
  const integrity = easypaisaConfig.merchantAccount + transactionId + amountPaise;

  const hmac = crypto
    .createHmac("sha256", easypaisaConfig.merchantPassword || easypaisaConfig.storePassword)
    .update(integrity)
    .digest("hex");

  if (!transactionId || transactionId.length > 128) { const error = new Error("Invalid EasyPaisa transaction ID"); error.status = 400; throw error; }
  const payload = {
    amount: amountPaise,
    email: email || "",
    mobileNum: mobileNumber || "",
    acceptMethd: "Debit,Cash,Credit",
    merchantAccount: easypaisaConfig.merchantAccount,
    storeId: easypaisaConfig.storeId,
    storePassword: easypaisaConfig.storePassword,
    ipnUrl: easypaisaConfig.ipnUrl,
    merchantHashedReq: hmac,
    merchantSecret: easypaisaConfig.merchantPassword || easypaisaConfig.storePassword,
    orderId: transactionId,
    orderReferenceNumber: orderReference,
    tokenType: "DEFAULT_TOKEN_REQUEST",
    initials: easypaisaConfig.initials,
    merchantTimeStamp: new Date().toISOString(),
    merchantName: easypaisaConfig.merchantAccount,
    // Optional fields
    signatureVersion: "1",
    signature: hmac,
  };

  const result = await requestJson(easypaisaConfig.paymentApi, payload);

  // Sandbox may wrap response differently; try common shapes
  const data = result?.Data || result?.data || result;

  const redirectUrl =
    data?.bufferURL ||
    data?.redirectURL ||
    data?.checkoutUrl ||
    data?.paymentUrl ||
    result?.redirectURL ||
    "";

  const gatewayTransactionId =
    data?.transactionId || data?.txnId || transactionId;

  return {
    redirectUrl,
    transactionId: gatewayTransactionId,
    raw: result,
  };
};

/**
 * Verify / confirm EasyPaisa payment status.
 */
export const verifyEasyPaisaPayment = async ({ transactionId, orderRef }) => {
  // Status endpoint signature differs by merchant; build defensively
  const payload = {
    merchantAccount: easypaisaConfig.merchantAccount,
    storeId: easypaisaConfig.storeId,
    transactionId,
    orderId: transactionId,
    orderReferenceNumber: orderRef || transactionId,
  };

  const result = await requestJson(easypaisaConfig.statusApi, payload);

  const data = result?.Data || result?.data || result;

  // Common success indicators
  const returnedAmount = data?.amount ?? data?.transactionAmount ?? data?.paidAmount ?? result?.amount ?? null;
  const statusCode = String(
    data?.statusCode ?? data?.status ?? result?.statusCode ?? result?.status ?? ""
  );

  const isSuccess =
    statusCode === "0" ||
    statusCode === "200" ||
    (typeof data?.transactionStatus === "string" &&
      data.transactionStatus.toLowerCase() === "completed") ||
    result?.success === true;

  return {
    isSuccess,
    transactionId,
    statusCode,
    amount: returnedAmount === null ? null : Number(returnedAmount),
    raw: result,
  };
};

/**
 * Refund an EasyPaisa payment (best-effort wrapper).
 */
export const refundEasyPaisaPayment = async ({ transactionId, amount }) => {
  const payload = {
    merchantAccount: easypaisaConfig.merchantAccount,
    storeId: easypaisaConfig.storeId,
    transactionId,
    refundAmount: amount,
    refundReason: "requested_by_customer",
  };

  const result = await requestJson(easypaisaConfig.refundApi, payload);
  return { ...result };
};

