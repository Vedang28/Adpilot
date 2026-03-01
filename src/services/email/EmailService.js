'use strict';

const { Resend } = require('resend');
const logger     = require('../../config/logger');

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@adpilot.io';

/**
 * EmailService — thin wrapper around Resend.
 *
 * Falls back to dry-run logging when RESEND_API_KEY is not set,
 * so development environments don't need the key configured.
 */
class EmailService {
  constructor() {
    if (process.env.RESEND_API_KEY) {
      this._resend = new Resend(process.env.RESEND_API_KEY);
    } else {
      this._resend = null;
      logger.warn('EmailService: RESEND_API_KEY not set — emails will be logged only');
    }
  }

  /**
   * Send a team invite email.
   * @param {object} params
   * @param {string} params.to         — recipient email
   * @param {string} params.inviterName— name of the person who sent the invite
   * @param {string} params.teamName   — team being joined
   * @param {string} params.role       — role being granted
   * @param {string} params.inviteUrl  — one-time accept link
   */
  async sendInvite({ to, inviterName, teamName, role, inviteUrl }) {
    const subject = `${inviterName} invited you to join ${teamName} on AdPilot`;
    const html    = buildInviteHtml({ inviterName, teamName, role, inviteUrl });

    return this._send({ to, subject, html });
  }

  /**
   * Send a system notification email.
   * Used by the notifications processor for channel='email'.
   */
  async sendNotification({ userId, message, type }) {
    // Fetch the user's email address
    const prisma = require('../../config/prisma');
    const user   = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user) return;

    const subject = `AdPilot Alert: ${type.replace(/_/g, ' ')}`;
    const html    = buildAlertHtml({ name: user.name, message, type });

    return this._send({ to: user.email, subject, html });
  }

  /**
   * Send a password reset email.
   */
  async sendPasswordReset({ to, name, resetUrl }) {
    const subject = 'Reset your AdPilot password';
    const html    = buildPasswordResetHtml({ name, resetUrl });
    return this._send({ to, subject, html });
  }

  async _send({ to, subject, html }) {
    if (!this._resend) {
      logger.info('EmailService DRY-RUN', { to, subject });
      return { id: 'dry-run' };
    }

    try {
      const result = await this._resend.emails.send({ from: FROM, to, subject, html });
      logger.info('Email sent', { to, subject, id: result.id });
      return result;
    } catch (err) {
      logger.error('Email send failed', { to, subject, error: err.message });
      throw err;
    }
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildInviteHtml({ inviterName, teamName, role, inviteUrl }) {
  const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to AdPilot</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:32px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">⚡ AdPilot</div>
            <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px;">AI-Powered Ad &amp; SEO Automation</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 12px;">You're invited to join a team</h1>
            <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">
              <strong style="color:#e2e8f0;">${inviterName}</strong> has invited you to join
              <strong style="color:#e2e8f0;">${teamName}</strong> as a
              <strong style="color:#e2e8f0;">${roleCapitalized}</strong>.
            </p>

            <div style="background:#0f1117;border:1px solid #2a2d3a;border-radius:12px;padding:20px;margin-bottom:28px;">
              <div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your role</div>
              <div style="color:#e2e8f0;font-size:16px;font-weight:600;">${roleCapitalized}</div>
            </div>

            <a href="${inviteUrl}"
               style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">
              Accept Invitation →
            </a>

            <p style="color:#475569;font-size:13px;line-height:1.5;margin:0;">
              This invitation expires in <strong>48 hours</strong>. If you didn't expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2d3a;text-align:center;">
            <p style="color:#475569;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} AdPilot. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildAlertHtml({ name, message, type }) {
  const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>AdPilot Alert</title></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px 40px;">
            <div style="font-size:22px;font-weight:800;color:#fff;">⚡ AdPilot Alert</div>
            <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:2px;">${typeLabel}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="color:#94a3b8;font-size:15px;margin:0 0 8px;">Hi ${name},</p>
            <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0;">${message}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px;border-top:1px solid #2a2d3a;text-align:center;">
            <p style="color:#475569;font-size:12px;margin:0;">© ${new Date().getFullYear()} AdPilot</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetHtml({ name, resetUrl }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>Reset your password</title></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:32px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">⚡ AdPilot</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 12px;">Reset your password</h1>
            <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi ${name}, we received a request to reset your AdPilot password. Click the button below to set a new one.</p>
            <a href="${resetUrl}"
               style="display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">
              Reset Password →
            </a>
            <p style="color:#475569;font-size:13px;line-height:1.5;margin:0;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2d3a;text-align:center;">
            <p style="color:#475569;font-size:12px;margin:0;">© ${new Date().getFullYear()} AdPilot. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = new EmailService();
