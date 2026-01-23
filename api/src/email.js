// Email service using Resend
// Handles verification emails and password reset emails

const BASE_URL = 'https://drift.surf';
const FROM_EMAIL = 'Drift <noreply@drift.surf>';

// Send email via Resend API
async function sendEmail(apiKey, to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Resend API error:', error);
    throw new Error('Failed to send email');
  }

  return response.json();
}

// Send verification email to new users
export async function sendVerificationEmail(apiKey, email, token, username) {
  const verifyUrl = `${BASE_URL}/verify-email.html?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fdf6e3; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #eee8d5; overflow: hidden;">
    <div style="padding: 32px; text-align: center; border-bottom: 1px solid #eee8d5;">
      <h1 style="margin: 0; color: #268bd2; font-size: 28px; font-weight: 600;">Drift</h1>
      <p style="margin: 8px 0 0; color: #93a1a1; font-size: 14px;">Discover serendipity</p>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #586e75; font-size: 16px; line-height: 1.5;">
        Hey ${username}! Welcome to the drifter fam.
      </p>
      <p style="margin: 0 0 24px; color: #586e75; font-size: 16px; line-height: 1.5;">
        Click the button below to verify your email address:
      </p>
      <a href="${verifyUrl}" style="display: inline-block; background-color: #2aa198; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 24px; font-weight: 500; font-size: 16px;">
        Verify Email
      </a>
      <p style="margin: 24px 0 0; color: #93a1a1; font-size: 13px; line-height: 1.5;">
        This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
    <div style="padding: 20px 32px; background: #eee8d5; text-align: center;">
      <p style="margin: 0; color: #93a1a1; font-size: 12px;">
        <a href="https://drift.surf" style="color: #268bd2; text-decoration: none;">drift.surf</a> - stumble upon hidden corners of the internet
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(apiKey, email, 'Verify your Drift email', html);
}

// Send password reset email
export async function sendPasswordResetEmail(apiKey, email, token, username) {
  const resetUrl = `${BASE_URL}/reset-password.html?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fdf6e3; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #eee8d5; overflow: hidden;">
    <div style="padding: 32px; text-align: center; border-bottom: 1px solid #eee8d5;">
      <h1 style="margin: 0; color: #268bd2; font-size: 28px; font-weight: 600;">Drift</h1>
      <p style="margin: 8px 0 0; color: #93a1a1; font-size: 14px;">Password Reset</p>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #586e75; font-size: 16px; line-height: 1.5;">
        Hey ${username}! Someone (hopefully you) requested a password reset for your Drift account.
      </p>
      <p style="margin: 0 0 24px; color: #586e75; font-size: 16px; line-height: 1.5;">
        Click the button below to set a new password:
      </p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #2aa198; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 24px; font-weight: 500; font-size: 16px;">
        Reset Password
      </a>
      <p style="margin: 24px 0 0; color: #93a1a1; font-size: 13px; line-height: 1.5;">
        This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <div style="padding: 20px 32px; background: #eee8d5; text-align: center;">
      <p style="margin: 0; color: #93a1a1; font-size: 12px;">
        <a href="https://drift.surf" style="color: #268bd2; text-decoration: none;">drift.surf</a> - stumble upon hidden corners of the internet
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail(apiKey, email, 'Reset your Drift password', html);
}
