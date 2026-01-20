import twilio from 'twilio';

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured');
    return null;
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an SMS message via Twilio
 */
export async function sendSMS(to: string, body: string): Promise<SMSResult> {
  const client = getTwilioClient();

  if (!client) {
    return {
      success: false,
      error: 'Twilio not configured',
    };
  }

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    return {
      success: false,
      error: 'Twilio phone number not configured',
    };
  }

  try {
    const message = await client.messages.create({
      body,
      to,
      from: fromNumber,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: unknown) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

/**
 * Validate Twilio configuration
 */
export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}
