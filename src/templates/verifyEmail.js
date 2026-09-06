export const emailVerificationTemplate = (otp) => {
  return `
    <div>
      <h2>Email Verification</h2>
      <p>Your OTP code is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
    </div>
  `;
};