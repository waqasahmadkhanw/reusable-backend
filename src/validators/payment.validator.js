/** Payment request validation rules. */
export const createPaymentRules = {
  orderId: {
    required: true,
    type: "string",
    min: 24,
    max: 24,
    regex: /^[a-f\d]{24}$/i,
  },
};

export const refundPaymentRules = {
  reason: { type: "string", min: 1, max: 500 },
};

export const paymentListQueryRules = {
  page: { type: "integer", min: 1, max: 100000 },
  limit: { type: "integer", min: 1, max: 100 },
  status: { type: "string", enum: ["pending", "completed", "failed", "refunded"] },
  paymentMethod: { type: "string", enum: ["stripe", "easypaisa", "jazzcash", "free", "other"] },
  search: { type: "string", min: 1, max: 120 },
  customer: { type: "string", min: 24, max: 24, regex: /^[a-f\d]{24}$/i },
  order: { type: "string", min: 24, max: 24, regex: /^[a-f\d]{24}$/i },
  from: { type: "string", min: 10, max: 30 },
  to: { type: "string", min: 10, max: 30 },
};
