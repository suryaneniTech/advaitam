import nodemailer from 'nodemailer';

function getTransporter() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in server/.env');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD.replace(/\s/g, ''),
    },
  });
}

function friendlyMailError(err) {
  const msg = err.message || '';
  if (msg.includes('Invalid login') || msg.includes('Username and Password not accepted')) {
    return 'Gmail rejected the login. Use a Google App Password, not your regular password.';
  }
  if (msg.includes('Gmail is not configured')) return msg;
  return `Failed to send email: ${msg}`;
}

export async function verifyGmailConnection() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn('Gmail not configured — email invites will not work');
    return false;
  }

  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log(`Gmail ready (${GMAIL_USER})`);
    return true;
  } catch (err) {
    console.error('Gmail connection failed:', friendlyMailError(err));
    return false;
  }
}

export async function sendInviteEmail({ to, tempPassword, expiresAt }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const from = process.env.MAIL_FROM || `Advaitam <${process.env.GMAIL_USER}>`;
  const expiryText = expiresAt
    ? `This invite expires on ${expiresAt.toLocaleDateString()} ${expiresAt.toLocaleTimeString()}.`
    : '';

  const transporter = getTransporter();

  const text = [
    'Welcome to Advaitam!',
    '',
    'An admin has invited you to join. Use the credentials below to sign in:',
    '',
    `Login URL: ${appUrl}/login`,
    `Email: ${to}`,
    `Temporary password: ${tempPassword}`,
    '',
    'You will be asked to set a new password on your first login.',
    expiryText,
    '',
    'If you did not expect this email, you can ignore it.',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: sans-serif; max-width: 520px; color: #1a1a1a;">
      <h2 style="margin-bottom: 8px;">Welcome to Advaitam</h2>
      <p>An admin has invited you to join. Sign in with the credentials below:</p>
      <table style="margin: 20px 0; border-collapse: collapse;">
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Login URL</td><td><a href="${appUrl}/login">${appUrl}/login</a></td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Email</td><td><strong>${to}</strong></td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Temporary password</td><td><strong>${tempPassword}</strong></td></tr>
      </table>
      <p style="color: #666; font-size: 14px;">You will be asked to set a new password on your first login.</p>
      ${expiryText ? `<p style="color: #666; font-size: 14px;">${expiryText}</p>` : ''}
    </div>
  `;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: 'Your Advaitam login invitation',
      text,
      html,
    });
  } catch (err) {
    throw new Error(friendlyMailError(err));
  }
}

export async function sendTestEmail(to) {
  const from = process.env.MAIL_FROM || `Advaitam <${process.env.GMAIL_USER}>`;
  const transporter = getTransporter();

  try {
    await transporter.sendMail({
      from,
      to,
      subject: 'Advaitam — Gmail test',
      text: 'Gmail is configured correctly. You can send user invites from Advaitam.',
      html: '<p>Gmail is configured correctly. You can send user invites from Advaitam.</p>',
    });
  } catch (err) {
    throw new Error(friendlyMailError(err));
  }
}
