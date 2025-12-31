// utils/brevo.ts
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

const apiKey = process.env.BREVO_API_KEY;
const fromEmail = process.env.BREVO_FROM_EMAIL || 'no-reply@eduzest.com';
const fromName = process.env.BREVO_FROM_NAME || 'EduZest';

if (!apiKey) {
  throw new Error('BREVO_API_KEY is missing in environment variables');
}

// Create instance
const transactionalEmailsApi = new TransactionalEmailsApi();

// Workaround: Cast to any to access protected 'authentications'
(transactionalEmailsApi as any).authentications.apiKey.apiKey = apiKey;

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<void> {
  try {
    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.textContent = text;
    sendSmtpEmail.htmlContent = html || `<p>${text.replace(/\n/g, '<br>')}</p>`;
    sendSmtpEmail.sender = { name: fromName, email: fromEmail };
    sendSmtpEmail.to = [{ email: to }];

    const result = await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);

    console.log('✅ OTP Email sent successfully via Brevo:', result);
  } catch (error: any) {
    console.error('❌ Error sending email via Brevo:', error);

    if (error.body) {
      console.error('Brevo Response Body:', error.body);
    }

    throw new Error('Failed to send email via Brevo');
  }
}