// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   service: "gmail",

//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// export default transporter;

import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify connection (important in production)
transporter.verify((error, success) => {
  if (error) {
    logger.error("SMTP verification failed", { error });
  } else {
    logger.info("Email server is ready");
  }
});

export default transporter;