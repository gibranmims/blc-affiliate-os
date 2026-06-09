const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const email = require('../lib/email');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function runDailyReminders() {
  const db = supabase();
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd   = endOfDay(now).toISOString();

  console.log(`[cron] Running daily challenge reminders: ${now.toISOString()}`);

  // ── 1. Send reminder emails: check-ins where the reminder is due today ──────
  // reminder is due on the due date = window_opens_at + 3 days = window center
  // We approximate: window center = window_opens_at + 3 days
  // But simpler: today falls within (window_opens_at, window_closes_at) and reminder not yet sent
  // We send the reminder on the midpoint day (window_opens_at + 3 days)

  const { data: remindable } = await db
    .from('challenge_checkins')
    .select('*, challengers(*)')
    .is('submitted_at', null)
    .is('reminder_sent_at', null)
    .lte('window_opens_at', todayEnd)       // window has opened
    .gte('window_closes_at', todayStart)    // window hasn't closed yet
    .eq('challengers.status', 'active');

  for (const checkin of (remindable || [])) {
    const challenger = checkin.challengers;
    if (!challenger || challenger.status !== 'active') continue;
    // Only send on or after the midpoint (window_opens_at + 3 days)
    const midpoint = new Date(checkin.window_opens_at);
    midpoint.setDate(midpoint.getDate() + 3);
    if (now < midpoint) continue;

    try {
      await email.sendCheckinReminder(challenger, checkin);
      await db.from('challenge_checkins').update({ reminder_sent_at: now.toISOString() }).eq('id', checkin.id);
      console.log(`[cron] Reminder sent: ${challenger.email} week ${checkin.week_number}`);
    } catch (err) {
      console.error(`[cron] Reminder failed for ${challenger.email}:`, err.message);
    }
  }

  // ── 2. Send warning emails: window closed today, no submission, no warning yet ──

  const { data: overdue } = await db
    .from('challenge_checkins')
    .select('*, challengers(*)')
    .is('submitted_at', null)
    .is('warning_sent_at', null)
    .lte('window_closes_at', todayEnd)     // regular window has closed
    .eq('challengers.status', 'active');

  for (const checkin of (overdue || [])) {
    const challenger = checkin.challengers;
    if (!challenger || challenger.status !== 'active') continue;

    const graceCloses = new Date(now);
    graceCloses.setDate(graceCloses.getDate() + 2);

    try {
      await db.from('challenge_checkins').update({
        warning_sent_at: now.toISOString(),
        grace_closes_at: graceCloses.toISOString()
      }).eq('id', checkin.id);
      await email.sendCheckinWarning(challenger, { ...checkin, grace_closes_at: graceCloses.toISOString() });
      console.log(`[cron] Warning sent: ${challenger.email} week ${checkin.week_number}`);
    } catch (err) {
      console.error(`[cron] Warning failed for ${challenger.email}:`, err.message);
    }
  }

  // ── 3. Disqualify: grace period has closed, still no submission ──────────────

  const { data: graceExpired } = await db
    .from('challenge_checkins')
    .select('*, challengers(*)')
    .is('submitted_at', null)
    .not('grace_closes_at', 'is', null)
    .lte('grace_closes_at', todayStart)    // grace window is fully past
    .eq('challengers.status', 'active');

  const disqualifiedIds = new Set();
  for (const checkin of (graceExpired || [])) {
    const challenger = checkin.challengers;
    if (!challenger || challenger.status !== 'active') continue;
    if (disqualifiedIds.has(challenger.id)) continue;

    try {
      await db.from('challengers').update({ status: 'disqualified' }).eq('id', challenger.id);
      disqualifiedIds.add(challenger.id);
      await email.sendDisqualification(challenger, checkin);
      console.log(`[cron] Disqualified: ${challenger.email} (missed week ${checkin.week_number})`);
    } catch (err) {
      console.error(`[cron] Disqualify failed for ${challenger.email}:`, err.message);
    }
  }

  console.log(`[cron] Done. Reminders: ${(remindable||[]).length} | Warnings: ${(overdue||[]).length} | Disqualified: ${disqualifiedIds.size}`);
}

function startCron() {
  // Run at 9:00 AM every day
  cron.schedule('0 9 * * *', () => {
    runDailyReminders().catch(err => console.error('[cron] Uncaught error:', err));
  });
  console.log('[cron] Challenge reminder cron scheduled (daily 9:00 AM)');
}

module.exports = { startCron, runDailyReminders };
