import { Resend } from 'resend';
import { escapeHtml } from '@/lib/utils/validation';

let resendClient: Resend | null = null;

function getResendClient() {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('Resend API key not configured');
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via Resend
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<EmailResult> {
  const client = getResendClient();

  if (!client) {
    return {
      success: false,
      error: 'Resend not configured',
    };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'orders@example.com';

  try {
    const response = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html: generateEmailHTML(body),
      text: body,
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
      };
    }

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error: unknown) {
    console.error('Resend email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #18181b; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Order Update</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #27272a;">
                ${escapeHtml(body).replace(/\n/g, '<br>')}
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding: 0 24px 32px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}"
                 style="display: inline-block; background-color: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                Track Your Order
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 24px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #71717a;">
                Questions? Reply to this email and we'll get back to you.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Validate Resend configuration
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
