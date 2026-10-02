const path = require('path');
const dotenv = require('dotenv');

// Explicitly load .env from backend directory before accessing process.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const nodemailer = require('nodemailer');

let cachedTransporter = null;

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
 * Inspects SMTP environment variables without exposing secret values
 */
function getSmtpStatus() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT || '465';
  const user = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
  const from = (process.env.SMTP_FROM || '').trim();

  const isConfigured = Boolean(user && rawPass);

  return {
    isConfigured,
    hasHost: Boolean(host),
    hasPort: Boolean(port),
    hasUser: Boolean(user),
    hasPass: Boolean(rawPass),
    hasFrom: Boolean(from),
    user: user ? maskEmail(user) : null
  };
}

/**
 * Checks whether SMTP settings are populated in environment variables
 */
function isSmtpConfigured() {
  const status = getSmtpStatus();
  return status.isConfigured;
}

/**
 * Creates and returns a single, reusable Nodemailer transporter instance
 */
function getTransporter(forceRefresh = false) {
  if (cachedTransporter && !forceRefresh) {
    return cachedTransporter;
  }

  const {
    SMTP_HOST = 'smtp.gmail.com',
    SMTP_PORT = '465',
    SMTP_SECURE = 'true',
    SMTP_USER,
    SMTP_PASS,
    SMTP_PASSWORD
  } = process.env;

  const rawPassword = (SMTP_PASS || SMTP_PASSWORD || '').trim();
  // Strip all spaces from 16-character Google App Passwords (e.g. 'abcd efgh ijkl mnop' -> 'abcdefghijklmnop')
  const cleanPassword = rawPassword.replace(/\s+/g, '');

  if (!SMTP_USER || !cleanPassword) {
    return null;
  }

  const portNum = parseInt(SMTP_PORT, 10) || 465;
  const isSecure = SMTP_SECURE === 'true' || portNum === 465;

  const transportConfig = {
    host: SMTP_HOST.trim(),
    port: portNum,
    secure: isSecure,
    auth: {
      user: SMTP_USER.trim(),
      pass: cleanPassword
    },
    // Safe timeouts to avoid hanging requests
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  };

  cachedTransporter = nodemailer.createTransport(transportConfig);
  return cachedTransporter;
}

/**
 * Verifies the SMTP transporter connection on backend startup.
 * Logs status clearly with host, port, user email, and category WITHOUT exposing secret credentials.
 */
async function verifyTransporter() {
  const status = getSmtpStatus();

  if (!status.isConfigured) {
    console.log('[ShadowTrace] SMTP configuration incomplete:');
    console.log(`SMTP_HOST=${status.hasHost}`);
    console.log(`SMTP_PORT=${status.hasPort}`);
    console.log(`SMTP_USER=${status.hasUser}`);
    console.log(`SMTP_PASS=${status.hasPass}`);
    console.log(`SMTP_FROM=${status.hasFrom}`);
    return false;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT || '465';
  const user = (process.env.SMTP_USER || '').trim();

  console.log('[ShadowTrace] SMTP configuration detected:');
  console.log(`[ShadowTrace]   Host: ${host}`);
  console.log(`[ShadowTrace]   Port: ${port}`);
  console.log(`[ShadowTrace]   Sender: ${user}`);

  const transporter = getTransporter(true);
  if (!transporter) {
    console.error('[ShadowTrace] SMTP transporter verification failed (Category: INITIALIZATION_ERROR)');
    return false;
  }

  try {
    await transporter.verify();
    console.log('[ShadowTrace] SMTP transporter verified successfully (Authentication: SUCCESS)');
    return true;
  } catch (err) {
    const isAuth = err.responseCode === 535 || err.code === 'EAUTH' || (err.message && err.message.toLowerCase().includes('username and password not accepted'));
    const category = isAuth ? 'AUTHENTICATION_FAILED' : 'CONNECTION_FAILED';
    console.error(`[ShadowTrace] SMTP transporter verification failed:`);
    console.error(`[ShadowTrace]   SMTP Host        : ${host}`);
    console.error(`[ShadowTrace]   SMTP Port        : ${port}`);
    console.error(`[ShadowTrace]   SMTP User        : ${user}`);
    console.error(`[ShadowTrace]   Error Code       : ${err.code || 'UNKNOWN'}`);
    console.error(`[ShadowTrace]   Response Code    : ${err.responseCode || 'N/A'}`);
    console.error(`[ShadowTrace]   Category         : ${category}`);
    console.error(`[ShadowTrace]   Server Response  : ${err.response || err.message}`);
    return false;
  }
}

/**
 * Categorizes an error from Nodemailer into a well-defined failure type
 */
function categorizeEmailError(err) {
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toUpperCase();

  if (code === 'SMTP_NOT_CONFIGURED' || msg.includes('missing') || msg.includes('incomplete')) {
    return {
      code: 'SMTP_NOT_CONFIGURED',
      clientMessage: 'Unable to send verification email. Please check the server email configuration.'
    };
  }

  // Gmail authentication errors (535, invalid credentials, incorrect App Password)
  if (
    code === 'EAUTH' ||
    err.responseCode === 535 ||
    msg.includes('username and password not accepted') ||
    msg.includes('invalid credentials') ||
    msg.includes('badcredentials') ||
    msg.includes('authentication')
  ) {
    return {
      code: 'SMTP_AUTH_FAILED',
      clientMessage: 'Unable to send verification email. Please check the server email configuration.'
    };
  }

  // Connection issues (timeout, unreachable host, DNS failure)
  if (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'ESOCKET' ||
    msg.includes('timeout') ||
    msg.includes('connect')
  ) {
    return {
      code: 'SMTP_CONNECTION_FAILED',
      clientMessage: 'Unable to send verification email. Connection to SMTP mail server timed out or failed.'
    };
  }

  // Recipient address rejection
  if (
    code === 'EENVELOPE' ||
    code === 'RECIPIENT_REJECTED' ||
    err.responseCode === 550 ||
    err.responseCode === 553 ||
    msg.includes('recipient')
  ) {
    return {
      code: 'RECIPIENT_REJECTED',
      clientMessage: 'Unable to send verification email. The recipient address was rejected by the mail provider.'
    };
  }

  return {
    code: 'EMAIL_SEND_FAILED',
    clientMessage: 'Unable to send verification email. Please try again.'
  };
}

/**
 * Sends a real 6-digit verification OTP email to the user's EXACT email address.
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

  if (!isSmtpConfigured()) {
    console.log('[ShadowTrace] SMTP configuration incomplete:');
    const status = getSmtpStatus();
    console.log(`SMTP_HOST=${status.hasHost}`);
    console.log(`SMTP_PORT=${status.hasPort}`);
    console.log(`SMTP_USER=${status.hasUser}`);
    console.log(`SMTP_PASS=${status.hasPass}`);
    console.log(`SMTP_FROM=${status.hasFrom}`);

    const err = new Error('SMTP configuration missing or invalid. A 16-character Gmail App Password is required.');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  const transporter = getTransporter();
  if (!transporter) {
    const err = new Error('Nodemailer SMTP transporter could not be initialized.');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  // Safe terminal log as requested:
  // [ShadowTrace] Sending verification email to: t***@gmail.com
  console.log(`[ShadowTrace] Sending verification email to: ${masked}`);

  const fromSender = process.env.SMTP_FROM || `"ShadowTrace" <${process.env.SMTP_USER}>`;
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
    const info = await transporter.sendMail({
      from: fromSender,
      to: recipientEmail, // MUST be the exact email entered by the user
      subject,
      text: plainText,
      html: htmlContent
    });

    if (Array.isArray(info.rejected) && info.rejected.includes(recipientEmail)) {
      console.error(`[ShadowTrace] Recipient was rejected by SMTP server: ${masked}`);
      const err = new Error(`Recipient email address was rejected by SMTP server: ${masked}`);
      err.code = 'RECIPIENT_REJECTED';
      throw err;
    }

    // Safe success log as requested:
    // [ShadowTrace] Verification email sent successfully
    console.log('[ShadowTrace] Verification email sent successfully');

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted
    };
  } catch (rawError) {
    const categorized = categorizeEmailError(rawError);
    console.error(`[ShadowTrace] Failed to send verification email:`);
    console.error(`[ShadowTrace]   Target Recipient : ${masked}`);
    console.error(`[ShadowTrace]   SMTP Host        : ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.error(`[ShadowTrace]   SMTP Port        : ${process.env.SMTP_PORT || '465'}`);
    console.error(`[ShadowTrace]   SMTP User        : ${process.env.SMTP_USER || 'none'}`);
    console.error(`[ShadowTrace]   Error Code       : ${rawError.code || 'UNKNOWN'}`);
    console.error(`[ShadowTrace]   Response Code    : ${rawError.responseCode || 'N/A'}`);
    console.error(`[ShadowTrace]   Category         : ${categorized.code}`);
    console.error(`[ShadowTrace]   Server Response  : ${rawError.response || rawError.message}`);
    const enrichedError = new Error(categorized.clientMessage);
    enrichedError.code = categorized.code;
    enrichedError.originalMessage = rawError.message;
    throw enrichedError;
  }
}

module.exports = {
  getSmtpStatus,
  isSmtpConfigured,
  getTransporter,
  verifyTransporter,
  sendVerificationOTP,
  sendOTPEmail: sendVerificationOTP,
  maskEmail
};
