const { BrevoClient } = require('@getbrevo/brevo')

/**
 * Safely masks an email address for logging to avoid leaking PII.
 * Example: 'alex.morgan@example.com' -> 'a***n@example.com'
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***'
  const [local, domain] = email.trim().split('@')
  if (!domain) return '***'
  const maskedLocal = local.length <= 2 ? `${local[0]}*` : `${local[0]}***${local[local.length - 1]}`
  return `${maskedLocal}@${domain}`
}

/**
 * Lazily creates and returns a BrevoClient instance.
 * Returns null if BREVO_API_KEY is not configured or is a placeholder.
 */
function getBrevoClient() {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey || !apiKey.trim() || apiKey.trim() === 'your-brevo-api-key') {
    return null
  }
  return new BrevoClient({ apiKey: apiKey.trim() })
}

/**
 * Renders a modern, responsive HTML email template for 6-digit verification codes.
 */
function renderEmailTemplate({ code, purpose, name, appName, expiryMinutes = 10 }) {
  const isPasswordReset = purpose === 'PASSWORD_RESET'
  const actionTitle = isPasswordReset ? 'Reset Your Password' : 'Verify Your Email'
  const actionDescription = isPasswordReset
    ? 'We received a request to reset the password for your TodoFlow account. Enter the 6-digit security code below to proceed:'
    : 'Welcome to TodoFlow! Please use the 6-digit security code below to verify your email address:'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${actionTitle} - ${appName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }
    .header {
      padding: 28px 32px 20px;
      border-bottom: 1px solid #f1f5f9;
    }
    .brand-mark {
      display: inline-block;
      width: 32px;
      height: 32px;
      line-height: 32px;
      text-align: center;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff;
      font-weight: 700;
      font-size: 16px;
      border-radius: 8px;
      vertical-align: middle;
      margin-right: 10px;
    }
    .brand-name {
      display: inline-block;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      vertical-align: middle;
      letter-spacing: -0.02em;
    }
    .content {
      padding: 32px 32px 24px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 20px;
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
    }
    .code-container {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .code-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
    }
    .code {
      font-family: 'SF Mono', 'Roboto Mono', Menlo, Consolas, Monaco, monospace;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 10px;
      color: #4f46e5;
      padding-left: 10px; /* Offset letter spacing for visual balance */
    }
    .notice {
      background-color: #fefce8;
      border-left: 4px solid #eab308;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 13px;
      color: #854d0e;
      line-height: 1.5;
      margin: 20px 0;
    }
    .footer {
      padding: 24px 32px;
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.6;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <span class="brand-mark">&#10003;</span>
        <span class="brand-name">${appName}</span>
      </div>
      <div class="content">
        <h1>${actionTitle}</h1>
        <p>Hello ${name ? name : 'there'},</p>
        <p>${actionDescription}</p>
        
        <div class="code-container">
          <div class="code-label">Verification Code</div>
          <div class="code">${code}</div>
        </div>

        <div class="notice">
          <strong>Security note:</strong> This code is valid for <strong>${expiryMinutes} minutes</strong>. If you did not request this verification, someone may have entered your email address by mistake; you can safely ignore this email.
        </div>

        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
          Never share this code with anyone. The ${appName} team will never ask you for your verification code.
        </p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.<br>
        Make space for what matters &bull; Built with focus
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Main email sending service via Brevo Transactional Email API.
 */
const emailService = {
  maskEmail,

  /**
   * Send a 6-digit verification code email.
   *
   * @param {Object} options
   * @param {string} options.email - Recipient email
   * @param {string} options.code - 6-digit plain code
   * @param {string} options.purpose - 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
   * @param {string} [options.name] - Recipient name
   * @returns {Promise<{success: boolean, messageId?: string, simulated?: boolean}>}
   */
  async sendVerificationCodeEmail({ email, code, purpose = 'EMAIL_VERIFICATION', name = '' }) {
    const appName = process.env.BREVO_SENDER_NAME || 'TodoFlow'
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@todoflow.local'
    const isPasswordReset = purpose === 'PASSWORD_RESET'
    const subject = isPasswordReset
      ? `${code} is your ${appName} password reset code`
      : `${code} is your ${appName} verification code`

    const htmlContent = renderEmailTemplate({
      code,
      purpose,
      name,
      appName,
      expiryMinutes: 10,
    })

    const textContent = `${appName} - ${isPasswordReset ? 'Password Reset' : 'Email Verification'}

Your 6-digit verification code is: ${code}

This code will expire in 10 minutes.
If you did not request this code, you can safely ignore this email.`

    const client = getBrevoClient()

    if (!client) {
      // In local dev/testing without a Brevo API key, log safely without crashing
      console.log(
        `[Brevo EmailService] (Dev simulation) No valid BREVO_API_KEY configured. Email simulated for ${maskEmail(
          email
        )}. Purpose: ${purpose}. Expiration: 10m.`
      )
      return { success: true, simulated: true }
    }

    try {
      const response = await client.transactionalEmails.sendTransacEmail({
        sender: {
          name: appName,
          email: senderEmail,
        },
        to: [
          {
            email: email.trim(),
            ...(name ? { name: name.trim() } : {}),
          },
        ],
        subject,
        htmlContent,
        textContent,
      })

      console.log(
        `[Brevo EmailService] Verification email successfully sent to ${maskEmail(email)}. MessageId: ${
          response?.messageId || 'ok'
        }`
      )

      return { success: true, messageId: response?.messageId }
    } catch (error) {
      // Clear error logging without leaking secrets or API keys
      console.error(
        `[Brevo EmailService] Error sending email to ${maskEmail(email)}:`,
        error.message || 'Unknown Brevo API error'
      )
      return { success: false, error: error.message || 'Email delivery failed' }
    }
  },
}

module.exports = emailService
