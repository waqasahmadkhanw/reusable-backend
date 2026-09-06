export const resetPasswordTemplate = (resetLink) => {
  const safeLink = String(resetLink).replace(/&/g, "&amp;");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 30px 25px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #eaeef2;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 28px;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.3px;">
          Reset Your Password
        </h2>
        <div style="width: 40px; height: 3px; background: #4F46E5; margin: 10px auto 0;"></div>
      </div>
      
      <!-- Body -->
      <p style="margin: 0 0 18px 0; font-size: 16px; line-height: 1.6; color: #2d3748;">
        We received a request to reset the password for your account. If you made this request, click the button below to securely set a new password.
      </p>
      
      <!-- Button - table based, Outlook-safe -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 28px auto 30px;">
        <tr>
          <td align="center" bgcolor="#4F46E5" style="border-radius: 8px;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeLink}" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="15%" fillcolor="#4F46E5" stroke="f">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:600;">Reset Password</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${safeLink}"
               target="_blank"
               rel="noopener noreferrer"
               style="display: inline-block; padding: 16px 40px; background-color: #4F46E5;
                      color: #ffffff; text-decoration: none; border-radius: 8px;
                      font-size: 17px; font-weight: 600; letter-spacing: 0.3px;
                      font-family: Arial, sans-serif;
                      -webkit-text-size-adjust: none;">
              Reset Password
            </a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>
      <p style="text-align: center; margin: -20px 0 30px 0; font-size: 13px; color: #94a3b8;">
        (Button opens in a new tab)
      </p>
      
      <!-- Security note -->
      <div style="background: #f8fafc; border-left: 4px solid #4F46E5; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #1e293b;">
          <strong>Security tip:</strong> This link will expire in <strong>15 minutes</strong>. 
          If you didn't request a password reset, you can safely ignore this email – your account remains secure.
        </p>
      </div>
      
      <!-- Fallback link -->
      <div style="padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 500; color: #475569;">
          ⚡ Button not working? Copy this link into your browser:
        </p>
        <a href="${safeLink}" style="display: block; padding: 12px; background: #f1f5f9; border-radius: 6px; 
                     font-family: 'Courier New', monospace; font-size: 14px; color: #0f172a; 
                     word-break: break-all; border: 1px solid #d1d9e6; text-decoration: none;">
          ${safeLink}
        </a>
      </div>
      
      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 18px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #94a3b8;">
        This is an automated message. Please do not reply to this email.
      </div>
    </div>
  `;
};