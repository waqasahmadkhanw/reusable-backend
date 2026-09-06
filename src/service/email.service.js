import transporter from "../config/nodemailer.js";
import { emailVerificationTemplate } from "../templates/verifyEmail.js";
import { resetPasswordTemplate } from "../templates/forgotPasswordEmail.js";
import { welcomeEmailTemplate } from "../templates/welcomeEmail.js";

const from=`"${process.env.APP_NAME||"My App"}" <${process.env.SMTP_EMAIL||process.env.EMAIL_USER||"no-reply@example.com"}>`;

class EmailService {
  static async sendEmail({to,subject,html}) {
    return transporter.sendMail({from,to,subject,html});
  }
  static async sendWelcomeEmail(user) {
    return this.sendEmail({to:user.email,subject:`Welcome to ${process.env.APP_NAME||"My App"}`,html:welcomeEmailTemplate({name:user.name})});
  }
  static async sendVerificationEmail(user,code) {
    return this.sendEmail({to:user.email,subject:"Verify your email",html:emailVerificationTemplate(code)});
  }
  static async sendResetPasswordEmail(user,resetLink) {
    return this.sendEmail({to:user.email,subject:"Reset your password",html:resetPasswordTemplate(resetLink)});
  }
}
export default EmailService;
