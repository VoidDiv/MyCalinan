/* ============================================================
   FILE: lib/server/Mailer.ts   (NEW — replaces lib/mailer.ts)

   TECHNIQUE: INTERFACE (ABSTRACTION) + POLYMORPHISM
   - Interface: `EmailSender` is a contract: "anything with a send() method".
     The rest of the app only knows the contract, not HOW the email is sent.
   - Polymorphism: SmtpEmailSender (real Gmail/SMTP) and ConsoleEmailSender
     (prints to your terminal while developing) both fulfil the same contract,
     so they can be swapped without changing any other code.

   SECURITY BENEFITS
   - The SMTP password stays inside SmtpEmailSender (private) and is only read
     from environment variables — never hard-coded.
   - ConsoleEmailSender is used ONLY when NODE_ENV is "development", so a
     production server can never print verification codes into its logs.
   - The recipient was already validated as ONE clean email (see EmailAddress).
   ============================================================ */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/* ───────────── the contract ───────────── */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/* ───────────── real sender (SMTP, e.g. Gmail App Password) ───────────── */
export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export class SmtpEmailSender implements EmailSender {
  private transporter: Transporter | null = null; // created on first use (lazy)

  constructor(private readonly config: SmtpConfig) {}

  /** Builds a sender from SMTP_USER / SMTP_PASS (and optional SMTP_HOST, SMTP_PORT, SMTP_FROM). */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): SmtpEmailSender {
    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;
    if (!user || !pass) throw new Error("Missing SMTP_USER or SMTP_PASS environment variable.");
    return new SmtpEmailSender({
      host: env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(env.SMTP_PORT ?? 465),
      user,
      pass,
      from: env.SMTP_FROM ?? `MyCalinan <${user}>`,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.getTransporter().sendMail({ from: this.config.from, ...message });
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.port === 465,
        auth: { user: this.config.user, pass: this.config.pass },
      });
    }
    return this.transporter;
  }
}

/* ───────────── development-only sender ───────────── */
export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.log(`\n[DEV EMAIL] to: ${message.to}\n${message.subject}\n${message.text}\n`);
  }
}

/* ───────────── the email's look ───────────── */
export class OtpEmailTemplate {
  /** Builds the subject + text + html for a verification code (the code is digits only). */
  static render(code: string, expiresInMinutes: number): Omit<EmailMessage, "to"> {
    const text =
      `Your MyCalinan verification code is ${code}.\n\n` +
      `It expires in ${expiresInMinutes} minutes. If you didn't request it, you can ignore this email.`;

    const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1a3d28">
    <h2 style="margin:0 0 4px;color:#1b4332">MyCalinan</h2>
    <p style="margin:0 0 20px;color:#556">Use this code to verify your email address.</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef6f0;border-radius:10px;padding:16px;text-align:center;color:#1b4332">${code}</div>
    <p style="margin:20px 0 0;font-size:13px;color:#667">
      This code expires in ${expiresInMinutes} minutes. If you didn't request it, you can ignore this email.
    </p>
  </div>`;

    return { subject: `${code} is your MyCalinan verification code`, text, html };
  }
}