import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
const stripe = key ? new Stripe(key) : null;

export const requireStripe = () => {
  if (!stripe) {
    const error = new Error("Stripe is not configured");
    error.statusCode = 503;
    throw error;
  }
  return stripe;
};

export default stripe;
