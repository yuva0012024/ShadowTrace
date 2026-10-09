const path = require('path');
const dotenv = require('dotenv');

// Explicitly load .env from backend directory before accessing process.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const nodemailer = require('nodemailer');

let cachedTransporter = null;

/**
 * Partially mask an email address for secure, zero-leak logging (e.g. s***@gmail.com)
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
 * Safely mask a secret for logs
 */
function maskSecret(str) {
  if (!str || typeof str !== 'string') return 'none';
  const clean = str.trim();
  if (clean.length <= 4) return '****';
  return `${clean.substring(0, 3)}****`;
}

/**
 * Normalizes and resolves the SMTP configuration from environment variables
 */
function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const isSecure = process.env.SMTP_SECURE !== undefined
    ? (process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === true)
    : (port === 465);
  const user = (process.env.SMTP_USER || '').trim();
  // Support Google App Passwords copied with or without spaces
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  // Resolve verified sender address
  const rawFrom = (
    process.env.SMTP_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    ''
  ).trim();

  let sender = '';
  if (rawFrom) {
    if (!rawFrom.includes('<') && rawFrom.includes('@')) {
      sender = `ShadowTrace <${rawFrom}>`;
    } else {
      sender = rawFrom;
    }
  } else if (user) {
    sender = `ShadowTrace <${user}>`;
  } else {
    sender = 'ShadowTrace <no-reply@shadowtrace.local>';
  }

  return {
    host,
    port,
    secure: isSecure,
    user,
    pass,
    sender
  };
}

/**
 * Inspects SMTP environment configuration without exposing secrets
 */
function getEmailServiceStatus() {
  const config = getSmtpConfig();
  const isConfigured = Boolean(config.user && config.pass);

  return {
    provider: 'Nodemailer Gmail SMTP',
    isConfigured,
    host: config.host,
    port: config.port,
    secure: config.secure,
    sender: config.sender,
    hasUser: Boolean(config.user),
    hasPass: Boolean(config.pass),
    maskedUser: maskEmail(config.user)
  };
}

/**
 * Checks whether SMTP credentials are fully populated
 */
function isEmailConfigured() {
  const status = getEmailServiceStatus();
  return status.isConfigured;
}

/**
 * Creates and returns a cached Nodemailer transporter instance
 */
function getTransporter(forceRefresh = false) {
  if (cachedTransporter && !forceRefresh) {
    return cachedTransporter;
  }

  const config = getSmtpConfig();
  if (!config.user || !config.pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    // Strict connection timeouts to prevent hanging on network/firewall blocks
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    pool: true,
    maxConnections: 3,
    maxMessages: 100
  });

  return cachedTransporter;
}

/**
 * Verifies email service configuration on backend startup.
 * Logs status clearly without exposing secret keys, App Passwords, or credentials.
 * Uses a non-blocking timeout check so server startup is never delayed.
 */
async function verifyEmailService() {
  const status = getEmailServiceStatus();

  if (!status.isConfigured) {
    console.log('[ShadowTrace] Nodemailer SMTP email service configuration incomplete:');
    console.log(`  SMTP_HOST        : ${status.host}`);
    console.log(`  SMTP_PORT        : ${status.port} (secure: ${status.secure})`);
    console.log(`  SMTP_USER        : ${status.hasUser ? status.maskedUser : 'missing'}`);
    console.log(`  SMTP_PASS        : ${status.hasPass ? '[CONFIGURED]' : 'missing'}`);
    console.log(`  SMTP_FROM_EMAIL  : ${status.sender}`);
    console.log('[ShadowTrace] Email OTP delivery will be disabled until SMTP_USER and SMTP_PASS are configured.');
    return false;
  }

  console.log('[ShadowTrace] Nodemailer Gmail SMTP email service detected:');
  console.log(`  Provider : Nodemailer Gmail SMTP`);
  console.log(`  Host     : ${status.host}:${status.port} (secure: ${status.secure})`);
  console.log(`  Sender   : ${status.sender}`);
  console.log(`  Account  : ${status.maskedUser}`);

  // Perform non-blocking verification with safety timeout
  try {
    const transporter = getTransporter();
    if (!transporter) return false;

    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP_VERIFY_TIMEOUT')), 7000)
    );

    await Promise.race([verifyPromise, timeoutPromise]);
    console.log('[ShadowTrace] Nodemailer SMTP connection successfully verified.');
    return true;
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('SMTP_VERIFY_TIMEOUT') || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.warn(`[ShadowTrace] WARNING: SMTP connection to ${status.host}:${status.port} timed out or was refused.`);
      console.warn('[ShadowTrace] Note: Free-tier cloud hosts (such as Render Free) restrict outbound traffic on SMTP ports 25, 465, and 587.');
      console.warn('[ShadowTrace] If running in a restricted cloud environment, an upgraded plan or HTTPS email provider is recommended.');
    } else if (err.code === 'EAUTH' || msg.includes('Invalid login') || msg.includes('535')) {
      console.warn(`[ShadowTrace] WARNING: SMTP authentication failed. Please verify your Google App Password.`);
    } else {
      console.warn(`[ShadowTrace] SMTP verification check warning: ${err.message}`);
    }
    return false;
  }
}

/**
 * Categorizes an SMTP / Nodemailer error into a well-defined failure code and safe client message
 */
function categorizeSmtpError(err) {
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || err.name || '').toUpperCase();
  const responseCode = err.responseCode || 0;

  // 1. SMTP Credentials / Authentication failure
  if (
    code === 'EAUTH' ||
    responseCode === 535 ||
    msg.includes('bad credentials') ||
    msg.includes('invalid login') ||
    msg.includes('username and password not accepted')
  ) {
    return {
      code: 'EMAIL_AUTH_FAILED',
      clientMessage: 'Unable to send verification email. Mail server authentication configuration error.'
    };
  }

  // 2. Recipient rejected / invalid address
  if (
    code === 'EENVELOPE' ||
    responseCode === 550 ||
    responseCode === 553 ||
    msg.includes('recipient') ||
    msg.includes('mailbox unavailable')
  ) {
    return {
      code: 'RECIPIENT_REJECTED',
      clientMessage: 'Unable to send verification email. The recipient address was rejected by the mail provider.'
    };
  }

  // 3. Network / Port Blocking / Connection Timeout (e.g. Render Free blocking ports 465/587)
  if (
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ESOCKETTIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    msg.includes('timeout') ||
    msg.includes('connection refused')
  ) {
    return {
      code: 'EMAIL_SEND_FAILED',
      clientMessage: 'Unable to send verification email. Mail server connection timed out or is restricted by the hosting provider.'
    };
  }

  return {
    code: 'EMAIL_SEND_FAILED',
    clientMessage: 'Unable to send verification email. Please try again.'
  };
}

/**
 * Builds the professional ShadowTrace-branded HTML email template
 */
function buildOtpEmailHtml({ subject, actionText, fullName, otpCode, isLogin }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
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
        If you did not request this verification, ignore this email. Never share this code with anyone.
      </div>
    </div>

    <div class="footer">
      SHADOWTRACE SECURE LOCATION INTELLIGENCE SYSTEM &copy; ${year}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends a real 6-digit verification OTP email via Nodemailer and Gmail SMTP.
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
    console.log('[ShadowTrace] Nodemailer SMTP email service configuration incomplete.');
    const err = new Error('Unable to send verification email. Please check the server email configuration.');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }

  const transporter = getTransporter();
  if (!transporter) {
    const err = new Error('Unable to send verification email. Please check the server email configuration.');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }

  const config = getSmtpConfig();
  const isLogin = purpose === 'LOGIN';
  const subject = isLogin
    ? 'ShadowTrace — Operative Session Verification Code'
    : 'ShadowTrace — Operative Registration Verification Code';

  const actionText = isLogin
    ? 'A login authentication request was initiated for your ShadowTrace operative clearance.'
    : 'A registration request was initiated to establish your operative clearance in the ShadowTrace digital location intelligence platform.';

  const plainText = `SHADOWTRACE
TRACE • ANALYZE • REVEAL

${isLogin ? 'OPERATIVE SESSION VERIFICATION' : 'OPERATIVE REGISTRATION VERIFICATION'}

Operative ${fullName},
${actionText}

Your verification code:
${otpCode}

This code expires in 5 minutes. Single-use clearance cipher.
If you did not request this verification, ignore this email. Never share this code with anyone.

SHADOWTRACE SECURE LOCATION INTELLIGENCE SYSTEM`;

  const htmlContent = buildOtpEmailHtml({
    subject,
    actionText,
    fullName,
    otpCode,
    isLogin
  });

  // Safe terminal log: never logs OTP, never logs passwords
  console.log(`[ShadowTrace] Sending verification email via Nodemailer to: ${masked}`);

  try {
    const info = await transporter.sendMail({
      from: config.sender,
      to: recipientEmail,
      subject,
      text: plainText,
      html: htmlContent
    });

    // Safe success log: never exposes secrets
    console.log(`[ShadowTrace] Verification email sent successfully (MessageId: ${info.messageId || 'OK'})`);

    return {
      success: true,
      messageId: info.messageId,
      id: info.messageId
    };
  } catch (rawError) {
    const categorized = categorizeSmtpError(rawError);

    // Safe diagnostic log without exposing App Passwords, OTP, or secret tokens
    console.error('[ShadowTrace] Failed to send verification email:');
    console.error(`  Target Recipient : ${masked}`);
    console.error(`  Provider         : Nodemailer Gmail SMTP (${config.host}:${config.port})`);
    console.error(`  Sender           : ${config.sender}`);
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
  verifyTransporter: verifyEmailService,
  getEmailServiceStatus,
  getSmtpStatus: getEmailServiceStatus,
  isEmailConfigured,
  isSmtpConfigured: isEmailConfigured,
  maskEmail
};
