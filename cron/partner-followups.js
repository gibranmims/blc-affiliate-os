const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const email = require('../lib/email');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

async function runPartnerFollowupCheck() {
  const db = supabase();
  const today = new Date().toISOString().split('T')[0];

  const { data: due, error } = await db
    .from('partner_leads')
    .select('*')
    .eq('status', 'contacted')          // only leads still awaiting a reply
    .lte('followup_due_date', today)
    .is('followup_sent_date', null);

  if (error) {
    console.error('[cron] Partner followup query error:', error.message);
    return;
  }

  if (due && due.length > 0) {
    try {
      await email.sendPartnerFollowupDigest(due);
    } catch (err) {
      console.error('[cron] Partner followup digest email failed:', err.message);
    }
  }
  console.log(`[cron] Partner outreach follow-up check: ${(due || []).length} due`);
}

function startPartnerFollowupCron() {
  // Run at 9:30 AM every day, after the 9:00 AM challenge cron
  cron.schedule('30 9 * * *', () => {
    runPartnerFollowupCheck().catch(err => console.error('[cron] Partner followup error:', err.message));
  });
  console.log('[cron] Partner outreach follow-up cron scheduled (daily 9:30 AM)');
}

module.exports = { startPartnerFollowupCron, runPartnerFollowupCheck };
