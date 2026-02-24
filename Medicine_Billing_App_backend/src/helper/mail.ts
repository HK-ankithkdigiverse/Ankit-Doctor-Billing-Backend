import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("SMTP ERROR", error);
  } else {
    console.log("SMTP READY");
  }
});

export const email_verification_mail = async (email: string, otp: string) => {
  try {
    await transporter.sendMail({
      from: `"MedBill Pro" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Your OTP for MedBill Pro",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MedBill Pro OTP</title>
</head>
<body style="margin:0; padding:0; background-color:#f2f3f8; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#1E6F5C; padding:25px; text-align:center; border-radius:8px 8px 0 0;">
              <h1 style="margin:0; color:#ffffff;">MedBill Pro</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:30px; color:#333;">
              <h2 style="margin-top:0;">Email Verification</h2>
              <p>Use the OTP below to verify your email for <strong>MedBill Pro</strong>.</p>

              <div style="text-align:center; margin:30px 0;">
                <span style="
                  display:inline-block;
                  padding:15px 30px;
                  font-size:28px;
                  letter-spacing:6px;
                  font-weight:bold;
                  background:#f2f3f8;
                  color:#1E6F5C;
                  border-radius:6px;
                ">
                  ${otp}
                </span>
              </div>

              <p style="color:#555;">This OTP is valid for <strong>5 minutes</strong>.</p>
              <p style="color:#555;">If you did not request this verification, please ignore this email.</p>

              <p style="margin-top:40px;">
                Regards,<br/>
                <strong>MedBill Pro Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px; text-align:center; font-size:12px; color:#999;">
              &copy; ${new Date().getFullYear()} MedBill Pro. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    return true;
  } catch (error) {
    console.error("Mail error", error);
    return false;
  }
};

