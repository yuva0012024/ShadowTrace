const path = require('path');
const dotenv = require('dotenv');

// Explicitly load .env from backend directory before accessing process.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

let cachedResendClient = null;
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
 * Safely mask an API key for logs (e.g. re_123***)
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return 'none';
  const clean = key.trim();
  if (clean.length <= 6) return '****';
  return `${clean.substring(0, 6)}****`;
}

/**
 * Safely mask a secret/password for logs
 */
function maskSecret(str) {
  if (!str || typeof str !== 'string') return 'none';
  const clean = str.trim();
  if (clean.length <= 4) return '****';
  return `${clean.substring(0, 3)}****`;
}

/**
 * Resolves Resend HTTPS configuration from environment variables
 */
function getResendConfig() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const rawFrom = (
    process.env.RESEND_FROM_EMAIL ||
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    ''
  ).trim();

  let sender = '';
  if (!rawFrom) {
    sender = 'ShadowTrace <onboarding@resend.dev>';
  } else if (!rawFrom.includes('<') && rawFrom.includes('@')) {
    sender = `ShadowTrace <${rawFrom}>`;
  } else {
    sender = rawFrom;
  }

  return {
    apiKey,
    sender,
    isConfigured: Boolean(apiKey)
  };
}

/**
 * Resolves Nodemailer SMTP configuration from environment variables
 */
function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const isSecure = process.env.SMTP_SECURE !== undefined
    ? (process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === true)
    : (port === 465);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

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
    sender,
    isConfigured: Boolean(user && pass)
  };
}

/**
 * Determines the active email provider based on configuration and hosting environment
 */
function resolveProvider() {
  const explicit = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'resend') return 'resend';
  if (explicit === 'smtp') return 'smtp';

  const resendCfg = getResendConfig();
  const smtpCfg = getSmtpConfig();

  // If RESEND_API_KEY is available, prefer Resend HTTPS (port 443, never blocked by Render)
  if (resendCfg.isConfigured) {
    return 'resend';
  }

  // If SMTP credentials are configured and no Resend key is set
  if (smtpCfg.isConfigured) {
    return 'smtp';
  }

  return 'none';
}

/**
 * Inspects email service configuration without exposing secrets
 */
function getEmailServiceStatus() {
  const activeProvider = resolveProvider();
  const resendCfg = getResendConfig();
  const smtpCfg = getSmtpConfig();

  const isConfigured = activeProvider === 'resend'
    ? resendCfg.isConfigured
    : (activeProvider === 'smtp' ? smtpCfg.isConfigured : false);

  const activeSender = activeProvider === 'resend'
    ? resendCfg.sender
    : (activeProvider === 'smtp' ? smtpCfg.sender : 'Unconfigured');

  const providerLabel = activeProvider === 'resend'
    ? 'Resend HTTPS API'
    : (activeProvider === 'smtp' ? 'Nodemailer Gmail SMTP' : 'Unconfigured');

  const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.IS_RENDER);

  return {
    provider: providerLabel,
    providerType: activeProvider,
    isConfigured,
    activeSender,
    // Resend configuration diagnostics (safe masks)
    resend: {
      isConfigured: resendCfg.isConfigured,
      hasApiKey: Boolean(resendCfg.apiKey),
      maskedApiKey: maskApiKey(resendCfg.apiKey),
      sender: resendCfg.sender
    },
    // SMTP configuration diagnostics (safe masks)
    smtp: {
      isConfigured: smtpCfg.isConfigured,
      host: smtpCfg.host,
      port: smtpCfg.port,
      secure: smtpCfg.secure,
      hasUser: Boolean(smtpCfg.user),
      hasPass: Boolean(smtpCfg.pass),
      maskedUser: maskEmail(smtpCfg.user),
      sender: smtpCfg.sender
    },
    // Environment metadata
    environment: {
      isRender,
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    // Backward compatibility fields
    host: smtpCfg.host,
    port: smtpCfg.port,
    secure: smtpCfg.secure,
    sender: activeSender,
    hasUser: Boolean(smtpCfg.user),
    hasPass: Boolean(smtpCfg.pass),
    maskedUser: maskEmail(smtpCfg.user),
    hasApiKey: Boolean(resendCfg.apiKey),
    maskedApiKey: maskApiKey(resendCfg.apiKey)
  };
}

/**
 * Checks whether an active email provider is configured
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

  const { apiKey } = getResendConfig();
  if (!apiKey) {
    return null;
  }

  try {
    const { Resend } = require('resend');
    cachedResendClient = new Resend(apiKey);
    return cachedResendClient;
  } catch (err) {
    console.error('[ShadowTrace] Failed to initialize Resend client:', err.message);
    return null;
  }
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

  try {
    const nodemailer = require('nodemailer');
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      // Strict connection timeouts to prevent hanging indefinitely on blocked ports
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 7000,
      pool: true,
      maxConnections: 3,
      maxMessages: 100
    });

    return cachedTransporter;
  } catch (err) {
    console.error('[ShadowTrace] Failed to initialize Nodemailer transporter:', err.message);
    return null;
  }
}

/**
 * Verifies email service configuration on backend startup.
 * Logs status clearly without exposing secret keys, App Passwords, or credentials.
 * Uses a non-blocking check so server startup is never delayed.
 */
async function verifyEmailService() {
  const status = getEmailServiceStatus();

  if (status.providerType === 'resend') {
    console.log('[ShadowTrace] Resend HTTPS API email service detected:');
    console.log('  Provider : Resend HTTPS API (Port 443)');
    console.log(`  Sender   : ${status.resend.sender}`);
    console.log(`  API Key  : [CONFIGURED] (${status.resend.maskedApiKey})`);
    return true;
  }

  if (status.providerType === 'smtp') {
    console.log('[ShadowTrace] Nodemailer Gmail SMTP email service detected:');
    console.log(`  Provider : Nodemailer Gmail SMTP`);
    console.log(`  Host     : ${status.smtp.host}:${status.smtp.port} (secure: ${status.smtp.secure})`);
    console.log(`  Sender   : ${status.smtp.sender}`);
    console.log(`  Account  : ${status.smtp.maskedUser}`);

    if (status.environment.isRender) {
      console.warn('[ShadowTrace] WARNING: Running on Render with SMTP configured.');
      console.warn('[ShadowTrace] Note: Free-tier cloud hosts (such as Render Free) restrict outbound traffic on SMTP ports 25, 465, and 587.');
      console.warn('[ShadowTrace] Setting RESEND_API_KEY in Render environment variables is recommended for reliable HTTPS delivery.');
    }

    // Perform non-blocking verification with safety timeout
    try {
      const transporter = getTransporter();
      if (!transporter) return false;

      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP_VERIFY_TIMEOUT')), 5000)
      );

      await Promise.race([verifyPromise, timeoutPromise]);
      console.log('[ShadowTrace] Nodemailer SMTP connection successfully verified.');
      return true;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('SMTP_VERIFY_TIMEOUT') || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
        console.warn(`[ShadowTrace] WARNING: SMTP connection to ${status.smtp.host}:${status.smtp.port} timed out or was refused.`);
        console.warn('[ShadowTrace] Free-tier cloud hosts (such as Render Free) restrict outbound traffic on SMTP ports 25, 465, and 587.');
        console.warn('[ShadowTrace] Please configure RESEND_API_KEY in environment variables to deliver emails via HTTPS.');
      } else if (err.code === 'EAUTH' || msg.includes('Invalid login') || msg.includes('535')) {
        console.warn(`[ShadowTrace] WARNING: SMTP authentication failed. Please verify your Google App Password.`);
      } else {
        console.warn(`[ShadowTrace] SMTP verification check warning: ${err.message}`);
      }
      return false;
    }
  }

  console.log('[ShadowTrace] Email service configuration incomplete:');
  console.log('  Neither RESEND_API_KEY nor SMTP credentials (SMTP_USER, SMTP_PASS) are configured.');
  console.log('[ShadowTrace] Email OTP delivery will be disabled until email provider credentials are provided.');
  return false;
}

/**
 * Categorizes an error from Resend into a well-defined failure code and safe client message
 */
function categorizeResendError(err) {
  const msg = (err.message || '').toLowerCase();
  const status = err.statusCode || err.status || 0;
  const code = (err.code || err.name || '').toUpperCase();

  // 1. Missing or invalid API key
  if (
    code === 'RESEND_NOT_CONFIGURED' ||
    status === 401 ||
    msg.includes('missing api key') ||
    msg.includes('api key is invalid') ||
    msg.includes('invalid api key') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid_token')
  ) {
    return {
      code: 'EMAIL_AUTH_FAILED',
      clientMessage: 'Unable to send verification email. Mail service authentication configuration error.'
    };
  }

  // 2. Forbidden / Domain unverified
  if (
    status === 403 ||
    msg.includes('domain') ||
    msg.includes('not verified') ||
    msg.includes('forbidden')
  ) {
    return {
      code: 'EMAIL_DOMAIN_UNVERIFIED',
      clientMessage: 'Unable to send verification email. Mail service domain verification error.'
    };
  }

  // 3. Recipient rejected or Resend trial mode limitation
  if (
    status === 422 ||
    code === 'VALIDATION_ERROR' ||
    msg.includes('can only send testing emails to your own email address') ||
    msg.includes('testing emails') ||
    msg.includes('recipient') ||
    msg.includes('restricted')
  ) {
    const isTrialRestriction = msg.includes('testing emails') || msg.includes('own email address');
    return {
      code: 'RECIPIENT_REJECTED',
      clientMessage: isTrialRestriction
        ? 'Resend trial mode: can only deliver emails to your verified Resend account email until a custom domain is verified in Resend.'
        : 'Unable to send verification email. The recipient address was rejected by the mail provider.'
    };
  }

  // 4. Rate limited (HTTP 429)
  if (
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  ) {
    return {
      code: 'EMAIL_RATE_LIMITED',
      clientMessage: 'Email delivery rate limit reached. Please wait a moment and try again.'
    };
  }

  // 5. Network / Timeout / Connection issues
  if (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'ESOCKET' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
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
 * Builds plain-text email representation as fallback
 */
function buildOtpPlainText({ subject, actionText, fullName, otpCode, isLogin }) {
  return `SHADOWTRACE
TRACE • ANALYZE • REVEAL

${isLogin ? 'OPERATIVE SESSION VERIFICATION' : 'OPERATIVE REGISTRATION VERIFICATION'}

Operative ${fullName},
${actionText}

Your verification code:
${otpCode}

This code expires in 5 minutes. Single-use clearance cipher.
If you did not request this verification, ignore this email. Never share this code with anyone.

SHADOWTRACE SECURE LOCATION INTELLIGENCE SYSTEM`;
}

/**
 * Dispatches a verification OTP email via the configured provider (Resend HTTPS API or Nodemailer SMTP).
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

  const provider = resolveProvider();

  if (provider === 'none') {
    console.error('[ShadowTrace] Email delivery attempted but no provider is configured.');
    const err = new Error('Unable to send verification email. Please check the server email configuration.');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }

  const isLogin = purpose === 'LOGIN';
  const subject = isLogin
    ? 'ShadowTrace — Operative Session Verification Code'
    : 'ShadowTrace — Operative Registration Verification Code';

  const actionText = isLogin
    ? 'A login authentication request was initiated for your ShadowTrace operative clearance.'
    : 'A registration request was initiated to establish your operative clearance in the ShadowTrace digital location intelligence platform.';

  const htmlContent = buildOtpEmailHtml({
    subject,
    actionText,
    fullName,
    otpCode,
    isLogin
  });

  const plainText = buildOtpPlainText({
    subject,
    actionText,
    fullName,
    otpCode,
    isLogin
  });

  // ==========================================
  // DISPATCH PATH 1: Resend HTTPS API (Port 443)
  // ==========================================
  if (provider === 'resend') {
    const resendCfg = getResendConfig();
    const resend = getResendClient();

    if (!resend) {
      const err = new Error('Unable to send verification email. Please check the server email configuration.');
      err.code = 'EMAIL_SEND_FAILED';
      throw err;
    }

    // Safe terminal log: never logs OTP, never logs API key
    console.log(`[ShadowTrace] Sending verification email via Resend HTTPS to: ${masked}`);

    try {
      const { data, error } = await resend.emails.send({
        from: resendCfg.sender,
        to: recipientEmail,
        subject,
        text: plainText,
        html: htmlContent
      });

      if (error) {
        const err = new Error(error.message || 'Resend email delivery failed');
        err.statusCode = error.statusCode || error.status;
        err.status = error.statusCode || error.status;
        err.name = error.name;
        throw err;
      }

      // Safe success log: never exposes secrets
      console.log(`[ShadowTrace] Verification email sent successfully via Resend (ID: ${data?.id || 'OK'})`);

      return {
        success: true,
        provider: 'resend',
        messageId: data?.id,
        id: data?.id
      };
    } catch (rawError) {
      const categorized = categorizeResendError(rawError);

      // Safe diagnostic log without exposing API key, OTP, or secret tokens
      console.error('[ShadowTrace] Failed to send verification email via Resend:');
      console.error(`  Target Recipient : ${masked}`);
      console.error('  Provider         : Resend HTTPS API (Port 443)');
      console.error(`  Sender           : ${resendCfg.sender}`);
      console.error(`  Status Code      : ${rawError.statusCode || rawError.status || 'N/A'}`);
      console.error(`  Category         : ${categorized.code}`);
      console.error(`  Service Message  : ${rawError.message || 'Unknown error'}`);

      const enrichedError = new Error(categorized.clientMessage);
      enrichedError.code = categorized.code;
      enrichedError.originalMessage = rawError.message;
      throw enrichedError;
    }
  }

  // ==========================================
  // DISPATCH PATH 2: Nodemailer Gmail SMTP
  // ==========================================
  const smtpCfg = getSmtpConfig();
  const transporter = getTransporter();

  if (!transporter) {
    const err = new Error('Unable to send verification email. Please check the server email configuration.');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }

  // Safe terminal log: never logs OTP, never logs passwords
  console.log(`[ShadowTrace] Sending verification email via Nodemailer SMTP to: ${masked}`);

  try {
    const info = await transporter.sendMail({
      from: smtpCfg.sender,
      to: recipientEmail,
      subject,
      text: plainText,
      html: htmlContent
    });

    // Safe success log: never exposes secrets
    console.log(`[ShadowTrace] Verification email sent successfully via SMTP (MessageId: ${info.messageId || 'OK'})`);

    return {
      success: true,
      provider: 'smtp',
      messageId: info.messageId,
      id: info.messageId
    };
  } catch (rawError) {
    const categorized = categorizeSmtpError(rawError);

    // Safe diagnostic log without exposing App Passwords, OTP, or secret tokens
    console.error('[ShadowTrace] Failed to send verification email via SMTP:');
    console.error(`  Target Recipient : ${masked}`);
    console.error(`  Provider         : Nodemailer Gmail SMTP (${smtpCfg.host}:${smtpCfg.port})`);
    console.error(`  Sender           : ${smtpCfg.sender}`);
    console.error(`  Category         : ${categorized.code}`);
    console.error(`  Service Message  : ${rawError.message || 'Unknown error'}`);

    // If SMTP timed out on a cloud provider and Resend is available as fallback
    const resendCfg = getResendConfig();
    if (resendCfg.isConfigured) {
      console.log('[ShadowTrace] SMTP failed. Attempting fallback via Resend HTTPS API...');
      try {
        const resend = getResendClient();
        const { data, error } = await resend.emails.send({
          from: resendCfg.sender,
          to: recipientEmail,
          subject,
          text: plainText,
          html: htmlContent
        });

        if (!error && data?.id) {
          console.log(`[ShadowTrace] Verification email sent successfully via Resend fallback (ID: ${data.id})`);
          return {
            success: true,
            provider: 'resend-fallback',
            messageId: data.id,
            id: data.id
          };
        }
      } catch (fallbackErr) {
        console.error('[ShadowTrace] Resend fallback attempt also failed:', fallbackErr.message);
      }
    }

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
  resolveProvider,
  getResendConfig,
  getSmtpConfig,
  maskEmail,
  maskApiKey,
  maskSecret
};
