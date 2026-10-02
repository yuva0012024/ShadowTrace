const path = require('path');
const dotenv = require('dotenv');

// Explicitly load .env from backend directory before accessing process.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { Resend } = require('resend');

let cachedResendClient = null;

/**
 * Partially mask an email address for secure, zero-leak logging (e.g. t***@gmail.com)
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return email || '';
  }
  const [local, domain] = email.split('@');
  if (local.length <= 1) {
    return `${local}***@${domain}`;
  }
  return `${local[0]}***@${domain}`;
}

/**
 * Safely mask an API key for logs (e.g. re_123***)
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return 'none';
  const clean = key.trim();
  if (clean.length <= 6) return '***';
  return `${clean.substring(0, 6)}***`;
}

/**
 * Resolves the verified sender address from environment variables.
 * Falls back to Resend's default onboarding sender if unset.
 */
function getSenderAddress() {
  const customFrom = (
    process.env.RESEND_FROM_EMAIL ||
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    ''
  ).trim();

  if (!customFrom) {
    return 'ShadowTrace <onboarding@resend.dev>';
  }

  // If the user specified only an email address without a display name, format it
  if (!customFrom.includes('<') && customFrom.includes('@')) {
    return `ShadowTrace <${customFrom}>`;
  }

  return customFrom;
}

/**
 * Inspects Resend environment configuration without exposing secrets
 */
function getEmailServiceStatus() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const sender = getSenderAddress();
  const isConfigured = Boolean(apiKey);

  return {
    provider: 'Resend HTTPS API',
    isConfigured,
    hasApiKey: Boolean(apiKey),
    sender,
    maskedApiKey: maskApiKey(apiKey)
  };
}

/**
 * Checks whether Resend API key is populated
 */
function isEmailConfigured() {
  const status = getEmailServiceStatus();
  return status.isConfigured;
}

/**
 * Creates and returns a cached Resend SDK client instance
 */
function getResendClient(forceRefresh = false) {
  if (cachedResendClient && !forceRefresh) {
    return cachedResendClient;
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }

  cachedResendClient = new Resend(apiKey);
  return cachedResendClient;
}

/**
 * Verifies email service configuration on backend startup.
 * Logs status clearly without exposing secret keys or sensitive tokens.
 */
async function verifyEmailService() {
  const status = getEmailServiceStatus();

  if (!status.isConfigured) {
    console.log('[ShadowTrace] Resend email service configuration incomplete:');
    console.log('  RESEND_API_KEY   : missing');
    console.log(`  RESEND_FROM_EMAIL: ${status.sender}`);
    console.log('[ShadowTrace] Email OTP delivery will be disabled until RESEND_API_KEY is configured.');
    return false;
  }

  console.log('[ShadowTrace] Resend HTTPS API email service detected:');
  console.log('  Provider : Resend HTTPS API');
  console.log(`  Sender   : ${status.sender}`);
  console.log(`  API Key  : [CONFIGURED] (${status.maskedApiKey})`);
  return true;
}

/**
 * Categorizes an error from Resend into a well-defined failure code and safe client message
 */
function categorizeResendError(err) {
  const msg = (err.message || '').toLowerCase();
  const status = err.statusCode || err.status || 0;
  const code = (err.code || err.name || '').toUpperCase();

  if (code === 'RESEND_NOT_CONFIGURED' || msg.includes('missing api key') || msg.includes('not configured')) {
    return {
      code: 'EMAIL_SEND_FAILED',
      clientMessage: 'Unable to send verification email. Please check the server email configuration.'
    };
  }

  // 401 Unauthorized / Invalid API Key
  if (status === 401 || msg.includes('api key is invalid') || msg.includes('invalid api key') || msg.includes('unauthorized')) {
    return {
      code: 'EMAIL_SEND_FAILED',
      clientMessage: 'Unable to send verification email. Please check the server email configuration.'
    };
  }

  // 403 Forbidden / Unverified sender domain
  if (status === 403 || msg.includes('domain') || msg.includes('not verified') || msg.includes('forbidden')) {
    return {
      code: 'EMAIL_SEND_FAILED',
      clientMessage: 'Unable to send verification email. Please check the server email configuration.'
    };
  }

  // 422 Unprocessable / Rejected recipient or domain restriction (e.g., onboarding@resend.dev sending to non-account email)
  if (
    status === 422 ||
    code === 'VALIDATION_ERROR' ||
    msg.includes('can only send testing emails to your own email address') ||
    msg.includes('recipient') ||
    msg.includes('restricted')
  ) {
    return {
      code: 'RECIPIENT_REJECTED',
      clientMessage: msg.includes('testing emails to your own email address')
        ? 'Resend trial mode: can only deliver emails to your verified Resend account email until a custom domain is added.'
        : 'Unable to send verification email. The recipient address was rejected by the mail provider.'
    };
  }

  // 429 Rate limited
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
    return {
      code: 'EMAIL_SEND_FAILED',
      clientMessage: 'Email delivery rate limit reached. Please wait a moment and try again.'
    };
  }

  // Network / Connection issues
  if (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'ESOCKET' ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('fetch failed')
  ) {
    return {
      code: 'EMAIL_SEND_FAILED',
      clientMessage: 'Unable to send verification email. Connection to mail service timed out or failed.'
    };
  }

  return {
    code: 'EMAIL_SEND_FAILED',
    clientMessage: 'Unable to send verification email. Please try again.'
  };
}

/**
 * Sends a real 6-digit verification OTP email via the Resend HTTPS API.
 * 
 * @param {string} toEmail - The EXACT recipient email address entered by the user
 * @param {string} otpCode - Cryptographically secure 6-digit OTP
 * @param {string} fullName - Recipient name
 * @param {'SIGNUP' | 'LOGIN'} purpose - Purpose of verification
 */
async function sendVerificationOTP(toEmail, otpCode, fullName = 'Operative', purpose = 'SIGNUP') {
  if (!toEmail || typeof toEmail !== 'string') {
    const err = new Error('A valid recipient email address is required.');
    err.code = 'INVALID_RECIPIENT';
    throw err;
  }

  const recipientEmail = toEmail.trim().toLowerCase();
  const masked = maskEmail(recipientEmail);

  if (!isEmailConfigured()) {
    console.log('[ShadowTrace] Resend email service configuration incomplete: RESEND_API_KEY is missing.');
    const err = new Error('Unable to send verification email. Please check the server email configuration.');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }

  const resend = getResendClient();
  if (!resend) {
    const err = new Error('Unable to send verification email. Please check the server email configuration.');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }

  // Safe terminal log: never logs OTP, never logs API key
  console.log(`[ShadowTrace] Sending verification email via Resend to: ${masked}`);

  const fromSender = getSenderAddress();
  const isLogin = purpose === 'LOGIN';
  const subject = isLogin
    ? 'ShadowTrace — Operative Session Verification Code'
    : 'ShadowTrace — Operative Registration Verification Code';

  const actionText = isLogin
    ? 'A login authentication request was initiated for your ShadowTrace operative clearance.'
    : 'A registration request was initiated to establish your operative clearance in the ShadowTrace digital location intelligence platform.';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #05070A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0; }
    .email-wrapper { max-width: 560px; margin: 36px auto; background: #0A0E17; border: 1px solid rgba(200, 162, 58, 0.35); border-radius: 12px; padding: 40px 32px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9); }
    .brand-header { text-align: center; margin-bottom: 28px; }
    .brand-title { font-size: 26px; font-weight: 800; letter-spacing: 0.28em; color: #C8A23A; margin: 0; text-transform: uppercase; }
    .brand-tagline { font-size: 11px; letter-spacing: 0.22em; color: #8E9BAE; margin-top: 6px; text-transform: uppercase; }
    .purpose-badge { display: inline-block; padding: 5px 14px; border-radius: 5px; background: rgba(200, 162, 58, 0.14); border: 1px solid rgba(200, 162, 58, 0.45); color: #F3D275; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; margin-top: 16px; text-transform: uppercase; }
    .content-body { margin-top: 24px; }
    .greeting { font-size: 16px; color: #F1F5F9; font-weight: 600; margin-bottom: 14px; }
    .description { font-size: 14px; line-height: 1.6; color: #94A3B8; margin-bottom: 18px; }
    .otp-card { background: rgba(200, 162, 58, 0.08); border: 1px solid rgba(200, 162, 58, 0.5); border-radius: 10px; padding: 24px; text-align: center; margin: 28px 0; }
    .otp-label { font-size: 11px; letter-spacing: 0.18em; color: #A0AEC0; text-transform: uppercase; margin-bottom: 8px; }
    .otp-code { font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #F3D275; margin: 0; text-shadow: 0 0 20px rgba(243, 210, 117, 0.45); }
    .otp-expiry { font-size: 12px; color: #8E9BAE; margin-top: 10px; }
    .security-notice { font-size: 12px; line-height: 1.55; color: #64748B; background: rgba(15, 23, 42, 0.6); border-left: 3px solid rgba(200, 162, 58, 0.4); padding: 12px 14px; border-radius: 4px; margin-top: 20px; }
    .footer { font-size: 11px; color: #475569; border-top: 1px solid rgba(200, 162, 58, 0.16); padding-top: 20px; margin-top: 28px; text-align: center; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="brand-header">
      <h1 class="brand-title">SHADOWTRACE</h1>
      <div class="brand-tagline">TRACE • ANALYZE • REVEAL</div>
      <div class="purpose-badge">${isLogin ? 'OPERATIVE SESSION VERIFICATION' : 'OPERATIVE REGISTRATION VERIFICATION'}</div>
    </div>

    <div class="content-body">
      <div class="greeting">Operative ${fullName},</div>
      <div class="description">${actionText}</div>
      <div class="description">Enter the one-time verification code below into ShadowTrace:</div>

      <div class="otp-card">
        <div class="otp-label">Your verification code:</div>
        <div class="otp-code">${otpCode}</div>
        <div class="otp-expiry">Expires in 5 minutes • Single-use clearance cipher</div>
      </div>

      <div class="security-notice">
        This code expires in 5 minutes.<br>
        If you did not request this verification, ignore this email.
      </div>
    </div>

    <div class="footer">
      SHADOWTRACE SECURE LOCATION INTELLIGENCE SYSTEM &copy; ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>
  `;

  const plainText = `SHADOWTRACE
TRACE • ANALYZE • REVEAL

Your verification code:
${otpCode}

This code expires in 5 minutes.
If you did not request this verification, ignore this email.`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromSender,
      to: recipientEmail,
      subject,
      text: plainText,
      html: htmlContent
    });

    if (error) {
      const err = new Error(error.message || 'Resend email delivery failed');
      err.statusCode = error.statusCode;
      err.status = error.statusCode;
      err.name = error.name;
      throw err;
    }

    // Safe success log: never exposes secrets
    console.log(`[ShadowTrace] Verification email sent successfully (ID: ${data?.id || 'OK'})`);

    return {
      success: true,
      messageId: data?.id,
      id: data?.id
    };
  } catch (rawError) {
    const categorized = categorizeResendError(rawError);

    // Safe diagnostic log without exposing API key, OTP, or secret tokens
    console.error('[ShadowTrace] Failed to send verification email:');
    console.error(`  Target Recipient : ${masked}`);
    console.error('  Provider         : Resend HTTPS API');
    console.error(`  Sender           : ${fromSender}`);
    console.error(`  Status Code      : ${rawError.statusCode || rawError.status || 'N/A'}`);
    console.error(`  Category         : ${categorized.code}`);
    console.error(`  Service Message  : ${rawError.message || 'Unknown error'}`);

    const enrichedError = new Error(categorized.clientMessage);
    enrichedError.code = categorized.code;
    enrichedError.originalMessage = rawError.message;
    throw enrichedError;
  }
}

module.exports = {
  sendVerificationOTP,
  sendOTPEmail: sendVerificationOTP,
  verifyEmailService,
  verifyTransporter: verifyEmailService, // backward compatibility with server.js
  getEmailServiceStatus,
  getSmtpStatus: getEmailServiceStatus,   // backward compatibility
  isEmailConfigured,
  isSmtpConfigured: isEmailConfigured,   // backward compatibility
  maskEmail
};
