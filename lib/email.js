const { Resend } = require('resend');

// Lazy init — key may not be present in local dev
function getResend() {
  return new Resend(process.env.RESEND_API_KEY || 'dev-placeholder');
}

const FROM = 'The Bikini Line Co. <hello@results.thebikiniline.co>';
const TEAM_EMAIL = 'hello@thebikiniline.co';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const CHALLENGE_URL = process.env.CHALLENGE_URL || APP_URL;

// ── Shared HTML wrapper ──────────────────────────────────────────

function wrap(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin:0; padding:0; background:#0a0a0a; font-family:'Helvetica Neue',Arial,sans-serif; color:#FFF6EB; }
    .container { max-width:560px; margin:40px auto; padding:0 20px; }
    .card { background:#111111; border:1px solid #2a2a2a; border-radius:12px; padding:36px; }
    .logo { font-size:13px; letter-spacing:0.12em; text-transform:uppercase; color:#a89880; margin-bottom:28px; }
    h1 { margin:0 0 16px; font-size:22px; font-weight:600; line-height:1.3; color:#FFF6EB; }
    p { margin:0 0 14px; font-size:14px; line-height:1.65; color:#a89880; }
    p strong { color:#FFF6EB; }
    .btn { display:inline-block; margin:20px 0 8px; padding:13px 28px; background:#FFF6EB; color:#0a0a0a; border-radius:8px; font-size:14px; font-weight:600; text-decoration:none; }
    .divider { height:1px; background:#2a2a2a; margin:24px 0; }
    .detail-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #1e1e1e; font-size:13px; }
    .detail-label { color:#665e52; }
    .detail-value { color:#FFF6EB; font-weight:500; }
    .footer { margin-top:24px; font-size:11px; color:#665e52; text-align:center; }
    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge-green { background:rgba(74,222,128,.12); color:#4ade80; }
    .badge-yellow { background:rgba(251,191,36,.12); color:#fbbf24; }
    .badge-red { background:rgba(248,113,113,.12); color:#f87171; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">The Bikini Line Co.</div>
      ${content}
    </div>
    <div class="footer">The Bikini Line Co. · Unsubscribe from challenge emails by replying to this email.</div>
  </div>
</body>
</html>`;
}

// ── Customer: Signup Confirmation ────────────────────────────────

async function sendSignupConfirmation(challenger) {
  const html = wrap(`
    <h1>You're in the Win Your Money Back Challenge!</h1>
    <p>Hey <strong>${challenger.name}</strong> — your entry has been confirmed. Here's how the next 8 weeks work:</p>
    <div class="divider"></div>
    <div class="detail-row"><span class="detail-label">Your order</span><span class="detail-value">#${challenger.order_number}</span></div>
    <div class="detail-row"><span class="detail-label">Challenge start</span><span class="detail-value">${new Date(challenger.signup_date).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}</span></div>
    <div class="divider"></div>
    <p>Every two weeks you'll receive an email with a unique check-in link. Submit a photo and confirm you've been using the BBL Serum every night. Complete all <strong>four check-ins</strong> and we'll refund your full $39.99.</p>
    <p><strong>Your first check-in link arrives in 2 weeks.</strong> Keep an eye on your inbox!</p>
    <p style="font-size:12px;color:#665e52;">Questions? Reply to this email and we'll get back to you.</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: "You're in — Win Your Money Back Challenge", html });
}

// ── Customer: Check-in Reminder ──────────────────────────────────

async function sendCheckinReminder(challenger, checkin) {
  const weekLabel = `Week ${checkin.week_number}`;
  const deadline = new Date(checkin.window_closes_at).toLocaleDateString('en-US', { month:'long', day:'numeric' });
  const link = `${CHALLENGE_URL}/challenge/checkin/${checkin.token}`;
  const html = wrap(`
    <h1>Time for your ${weekLabel} check-in!</h1>
    <p>Hey <strong>${challenger.name}</strong> — it's been ${checkin.week_number} weeks and it's time to show your progress. Snap a photo and submit your check-in below.</p>
    <a href="${link}" class="btn">Submit ${weekLabel} Check-In</a>
    <div class="divider"></div>
    <div class="detail-row"><span class="detail-label">Submission deadline</span><span class="detail-value">${deadline}</span></div>
    <div class="detail-row"><span class="detail-label">Check-ins remaining after this</span><span class="detail-value">${4 - checkin.week_number / 2}</span></div>
    <div class="divider"></div>
    <p>Remember: use your BBL Serum every night for the best results — and to stay eligible for your refund.</p>
    <p style="font-size:12px;color:#665e52;">If the button doesn't work, copy this link: ${link}</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: `BBL Challenge — ${weekLabel} check-in is ready`, html });
}

// ── Customer: Warning (missed window) ───────────────────────────

async function sendCheckinWarning(challenger, checkin) {
  const weekLabel = `Week ${checkin.week_number}`;
  const grace = new Date(checkin.grace_closes_at).toLocaleDateString('en-US', { month:'long', day:'numeric' });
  const link = `${CHALLENGE_URL}/challenge/checkin/${checkin.token}`;
  const html = wrap(`
    <h1>Action required — 48 hours to submit your ${weekLabel} check-in</h1>
    <p>Hey <strong>${challenger.name}</strong> — your ${weekLabel} submission window is closing. You have until <strong>${grace}</strong> to submit your photo before you're disqualified from the refund challenge.</p>
    <a href="${link}" class="btn">Submit Now Before It's Too Late</a>
    <div class="divider"></div>
    <p>If you miss this deadline your entry will be closed. You can still keep using your BBL Serum — you just won't be eligible for the refund.</p>
    <p style="font-size:12px;color:#665e52;">If the button doesn't work, copy this link: ${link}</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: `Action required — BBL Challenge ${weekLabel} deadline extended 48 hours`, html });
}

// ── Customer: Congratulations (completed all 4) ──────────────────

async function sendCongratulations(challenger) {
  const html = wrap(`
    <h1>You completed the challenge!</h1>
    <p>Hey <strong>${challenger.name}</strong> — you did it! All four check-ins are complete. Our team is reviewing your submission and will process your $39.99 refund to the original payment method shortly.</p>
    <div class="divider"></div>
    <div class="detail-row"><span class="detail-label">Order number</span><span class="detail-value">#${challenger.order_number}</span></div>
    <div class="detail-row"><span class="detail-label">Refund amount</span><span class="detail-value">$39.99</span></div>
    <div class="divider"></div>
    <p>Refunds typically take 5–10 business days to appear on your statement. You'll receive a separate confirmation once it's processed.</p>
    <p>Thank you for being part of the BBL Serum journey — your before and after is amazing!</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: 'You completed the BBL Challenge — refund incoming!', html });
}

// ── Customer: Disqualification ───────────────────────────────────

async function sendDisqualification(challenger, checkin) {
  const weekLabel = `Week ${checkin.week_number}`;
  const html = wrap(`
    <h1>Your challenge entry has ended</h1>
    <p>Hey <strong>${challenger.name}</strong> — unfortunately your BBL Challenge entry has closed because the ${weekLabel} check-in window passed without a submission.</p>
    <div class="divider"></div>
    <p>You can still continue using your BBL Serum — consistency is what gets you results. If you purchase another bottle in the future, you're always welcome to try the challenge again.</p>
    <p style="font-size:12px;color:#665e52;">Questions? Reply to this email and we'll be happy to chat.</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: 'Your BBL Challenge entry has closed', html });
}

// ── Team: New Challenger Signed Up ──────────────────────────────

async function notifyTeamNewSignup(challenger) {
  const html = wrap(`
    <h1>New BBL Challenge signup</h1>
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${challenger.name}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${challenger.email}</span></div>
    <div class="detail-row"><span class="detail-label">Order #</span><span class="detail-value">${challenger.order_number}</span></div>
    <div class="detail-row"><span class="detail-label">Signed up</span><span class="detail-value">${new Date().toLocaleString('en-US', { timeZone:'America/New_York' })} ET</span></div>
    <div class="divider"></div>
    <a href="${APP_URL}/?page=challenge" class="btn">View in Dashboard</a>
  `);
  return getResend().emails.send({ from: FROM, to: TEAM_EMAIL, subject: `New BBL challenger: ${challenger.name}`, html });
}

// ── Team: Check-in Submitted ─────────────────────────────────────

async function notifyTeamCheckin(challenger, checkin) {
  const weekLabel = `Week ${checkin.week_number}`;
  const html = wrap(`
    <h1>${challenger.name} submitted ${weekLabel} check-in</h1>
    <div class="detail-row"><span class="detail-label">Customer</span><span class="detail-value">${challenger.name} · ${challenger.email}</span></div>
    <div class="detail-row"><span class="detail-label">Order #</span><span class="detail-value">${challenger.order_number}</span></div>
    <div class="detail-row"><span class="detail-label">Used consistently</span><span class="detail-value">${checkin.used_consistently ? 'Yes' : 'No'}</span></div>
    ${checkin.notes ? `<div class="detail-row"><span class="detail-label">Notes</span><span class="detail-value">${checkin.notes}</span></div>` : ''}
    <div class="divider"></div>
    <a href="${APP_URL}/?page=challenge" class="btn">View in Dashboard</a>
  `);
  return getResend().emails.send({ from: FROM, to: TEAM_EMAIL, subject: `BBL Check-in: ${challenger.name} — ${weekLabel}`, html });
}

// ── Team: Challenge Completed, Refund Eligible ───────────────────

async function notifyTeamCompleted(challenger) {
  const html = wrap(`
    <h1>${challenger.name} completed the BBL Challenge</h1>
    <p>All four check-ins are in. This customer is eligible for their $39.99 refund.</p>
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${challenger.name}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${challenger.email}</span></div>
    <div class="detail-row"><span class="detail-label">Order #</span><span class="detail-value">${challenger.order_number}</span></div>
    <div class="divider"></div>
    <a href="${APP_URL}/?page=challenge" class="btn">Approve Refund in Dashboard</a>
  `);
  return getResend().emails.send({ from: FROM, to: TEAM_EMAIL, subject: `Refund eligible: ${challenger.name} finished the BBL Challenge`, html });
}

// ── Team: Refund Approved ────────────────────────────────────────

async function notifyTeamRefundApproved(challenger) {
  const html = wrap(`
    <h1>Refund marked as approved</h1>
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${challenger.name}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${challenger.email}</span></div>
    <div class="detail-row"><span class="detail-label">Order #</span><span class="detail-value">${challenger.order_number}</span></div>
    <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">$39.99</span></div>
    <div class="divider"></div>
    <p>Process the refund manually in Shopify for order <strong>#${challenger.order_number}</strong>, then mark it complete in your Shopify admin.</p>
  `);
  return getResend().emails.send({ from: FROM, to: TEAM_EMAIL, subject: `Process refund — ${challenger.name} (Order #${challenger.order_number})`, html });
}

module.exports = {
  sendSignupConfirmation,
  sendCheckinReminder,
  sendCheckinWarning,
  sendCongratulations,
  sendDisqualification,
  notifyTeamNewSignup,
  notifyTeamCheckin,
  notifyTeamCompleted,
  notifyTeamRefundApproved
};
