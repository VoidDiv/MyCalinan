/* ============================================================
   FILE: lib/mailer.ts   (NEW — server only)
   Sends the verification-code email through SMTP (Nodemailer).
   Works with a Gmail account + App Password out of the box.

   Required env vars (.env.local):
     SMTP_USER   the sending address, e.g. mycalinan.app@gmail.com
     SMTP_PASS   a Gmail App Password (NOT your normal password)
   Optional:
     SMTP_HOST   default smtp.gmail.com
     SMTP_PORT   default 465
     SMTP_FROM   default "MyCalinan <SMTP_USER>"
   ============================================================ */

import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("Missing SMTP_USER or SMTP_PASS environment variable.");
  }

  const port = Number(process.env.SMTP_PORT ?? 465);

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendOtpEmail(
  to: string,
  code: string,
  expiresInMinutes: number
): Promise<void> {
  const from = process.env.SMTP_FROM ?? `MyCalinan <${process.env.SMTP_USER}>`;

  const text =
    `Your MyCalinan verification code is ${code}.\n\n` +
    `It expires in ${expiresInMinutes} minutes. ` +
    `If you didn't request it, you can ignore this email.`;

  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1a3d28">
    <h2 style="margin:0 0 4px;color:#1b4332">MyCalinan</h2>
    <p style="margin:0 0 20px;color:#556">Use this code to verify your email address.</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef6f0;border-radius:10px;padding:16px;text-align:center;color:#1b4332">
      ${code}
    </div>
    <p style="margin:20px 0 0;font-size:13px;color:#667">
      This code expires in ${expiresInMinutes} minutes. If you didn't request it, you can ignore this email.
    </p>
  </div>`;

  await getTransporter().sendMail({
    from,
    to,
    subject: `${code} is your MyCalinan verification code`,
    text,
    html,
  });
}