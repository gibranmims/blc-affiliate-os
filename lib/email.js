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
  const startDate = new Date(challenger.signup_date).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  const html = wrap(`
    <h1>You're in.</h1>
    <p>Hey <strong>${challenger.name}</strong> — you just joined the Win Your Money Back Challenge. Here's exactly what happens next:</p>
    <div class="divider"></div>
    <p style="margin:0 0 6px;font-size:14px;color:#a89880;">→ &nbsp;Every 2 weeks, a check-in link lands in your inbox</p>
    <p style="margin:0 0 6px;font-size:14px;color:#a89880;">→ &nbsp;Click it, upload a photo, confirm you've been consistent</p>
    <p style="margin:0 0 6px;font-size:14px;color:#a89880;">→ &nbsp;Complete all 4 check-ins and we refund your $39.99</p>
    <div class="divider"></div>
    <div class="detail-row"><span class="detail-label">Order number</span><span class="detail-value">#${challenger.order_number}</span></div>
    <div class="detail-row"><span class="detail-label">Challenge started</span><span class="detail-value">${startDate}</span></div>
    <div class="divider"></div>
    <p>Your first check-in arrives in <strong>2 weeks</strong>. Keep an eye on your inbox.</p>
    <p>Until then — one rule: <strong>BBL Serum. Clean dry skin. Every night.</strong></p>
    <p style="font-size:12px;color:#665e52;">Questions? Reply to this email.</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: "You're in — Win Your Money Back Challenge", html });
}

// ── Customer: Check-in Reminder ──────────────────────────────────

async function sendCheckinReminder(challenger, checkin) {
  const weekLabel = `Week ${checkin.week_number}`;
  const checkinsLeft = 4 - (checkin.week_number / 2);
  const deadline = new Date(checkin.window_closes_at).toLocaleDateString('en-US', { month:'long', day:'numeric' });
  const link = `${CHALLENGE_URL}/challenge/checkin/${checkin.token}`;
  const html = wrap(`
    <h1>Your ${weekLabel} check-in is ready.</h1>
    <p>Hey <strong>${challenger.name}</strong> — it's been ${checkin.week_number} weeks. Time to submit your progress photo.</p>
    <a href="${link}" class="btn">Submit ${weekLabel} check-in</a>
    <div class="divider"></div>
    <div class="detail-row"><span class="detail-label">Deadline</span><span class="detail-value">${deadline}</span></div>
    <div class="detail-row"><span class="detail-label">Check-ins left after this</span><span class="detail-value">${checkinsLeft} of 4</span></div>
    <div class="divider"></div>
    <p style="font-size:12px;color:#665e52;">Button not working? Copy this link: ${link}</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: `${weekLabel} check-in is open — BBL Challenge`, html });
}

// ── Customer: Warning (missed window) ───────────────────────────

async function sendCheckinWarning(challenger, checkin) {
  const weekLabel = `Week ${checkin.week_number}`;
  const grace = new Date(checkin.grace_closes_at).toLocaleDateString('en-US', { month:'long', day:'numeric' });
  const link = `${CHALLENGE_URL}/challenge/checkin/${checkin.token}`;
  const html = wrap(`
    <h1>Last chance.</h1>
    <p>Hey <strong>${challenger.name}</strong> — your ${weekLabel} window just closed but we're giving you <strong>48 more hours</strong>.</p>
    <p>Submit by <strong>${grace}</strong> or your entry closes for good.</p>
    <a href="${link}" class="btn">Submit now</a>
    <div class="divider"></div>
    <p style="font-size:12px;color:#665e52;">Button not working? Copy this link: ${link}</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: `48 hours left — submit your ${weekLabel} check-in`, html });
}

// ── Customer: Congratulations (completed all 4) ──────────────────

async function sendCongratulations(challenger) {
  const html = wrap(`
    <h1>You did it.</h1>
    <p>Hey <strong>${challenger.name}</strong> — all 4 check-ins are in. Challenge complete.</p>
    <div class="divider"></div>
    <div class="detail-row"><span class="detail-label">Order number</span><span class="detail-value">#${challenger.order_number}</span></div>
    <div class="detail-row"><span class="detail-label">Refund amount</span><span class="detail-value">$39.99</span></div>
    <div class="divider"></div>
    <p>We're processing your refund now. Give it <strong>5–10 business days</strong> to appear on your statement.</p>
    <p>Thank you for trusting us with your skin. Your results are the reason we do this.</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: 'Challenge complete — your refund is on the way', html });
}

// ── Customer: Disqualification ───────────────────────────────────

async function sendDisqualification(challenger, checkin) {
  const weekLabel = `Week ${checkin.week_number}`;
  const html = wrap(`
    <h1>Your entry has closed.</h1>
    <p>Hey <strong>${challenger.name}</strong> — your ${weekLabel} check-in window passed without a submission, so your challenge entry is closed.</p>
    <div class="divider"></div>
    <p>You can still keep using your BBL Serum — it works whether or not you're in the challenge.</p>
    <p style="font-size:12px;color:#665e52;">Questions? Reply to this email.</p>
  `);
  return getResend().emails.send({ from: FROM, to: challenger.email, subject: 'Your BBL Challenge entry has closed', html });
}

// ── Team: New Challenger Signed Up ──────────────────────────────

async function notifyTeamNewSignup(challenger) {
  const html = wrap(`
    <h1>New challenger: ${challenger.name}</h1>
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${challenger.name}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${challenger.email}</span></div>
    <div class="detail-row"><span class="detail-label">Order #</span><span class="detail-value">${challenger.order_number}</span></div>
    <div class="detail-row"><span class="detail-label">Body part</span><span class="detail-value">${challenger.body_part || '—'}</span></div>
    <div class="detail-row"><span class="detail-label">Signed up</span><span class="detail-value">${new Date().toLocaleString('en-US', { timeZone:'America/New_York' })} ET</span></div>
    <div class="divider"></div>
    <a href="${APP_URL}/?page=challenge" class="btn">View in dashboard</a>
  `);
  return getResend().emails.send({ from: FROM, to: TEAM_EMAIL, subject: `New challenger: ${challenger.name}`, html });
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
    <h1>Process refund — ${challenger.name}</h1>
    <p>All 4 check-ins are in. Issue the $39.99 refund in Shopify.</p>
    <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${challenger.name}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${challenger.email}</span></div>
    <div class="detail-row"><span class="detail-label">Order #</span><span class="detail-value">${challenger.order_number}</span></div>
    <div class="detail-row"><span class="detail-label">Refund amount</span><span class="detail-value">$39.99</span></div>
    <div class="divider"></div>
    <a href="${APP_URL}/?page=challenge" class="btn">View in dashboard</a>
  `);
  return getResend().emails.send({ from: FROM, to: TEAM_EMAIL, subject: `Process refund — ${challenger.name} (#${challenger.order_number})`, html });
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
