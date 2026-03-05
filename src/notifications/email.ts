import nodemailer from 'nodemailer';
import axios from 'axios';
import { AppConfig } from '../config';

export interface EmailPayload {
  subject: string;
  text?: string;
  html?: string;
}

export async function sendReportEmail(config: AppConfig, payload: EmailPayload): Promise<void> {
  const emailCfg = config.notifications.email;
  if (!emailCfg?.to || !emailCfg.from) {
    return;
  }

  // 优先使用 Resend
  if (emailCfg.resendApiKey) {
    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: emailCfg.from,
          to: [emailCfg.to],
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
        },
        {
          headers: {
            Authorization: `Bearer ${emailCfg.resendApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return;
    } catch (e) {
      console.error('[email] Resend failed, fallback to SMTP if configured.', (e as Error).message);
    }
  }

  if (!emailCfg.smtp?.host || !emailCfg.smtp.user || !emailCfg.smtp.pass) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: emailCfg.smtp.host,
    port: emailCfg.smtp.port ?? 587,
    secure: emailCfg.smtp.secure ?? false,
    auth: {
      user: emailCfg.smtp.user,
      pass: emailCfg.smtp.pass,
    },
  });

  await transporter.sendMail({
    from: emailCfg.from,
    to: emailCfg.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

