export const createCouponRules = {
  code: { required: true, type: "string", min: 2, max: 50 },
  discountType: { required: true, type: "string", enum: ["percentage", "fixed"] },
  discountValue: { required: true, type: "number", min: 0 },
  expiryDate: { required: true, type: "string" },
};
