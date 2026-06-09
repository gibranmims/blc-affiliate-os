const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'challenge-photos';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// Upload a Buffer to Supabase Storage.
// path example: "abc-uuid/week_0.jpg"
// Returns the public/signed URL string.
async function uploadPhoto(buffer, storagePath, contentType) {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`);
  return storagePath;
}

// Generate a short-lived signed URL for viewing a photo in the dashboard.
async function signedUrl(storagePath, expiresInSeconds = 3600) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw new Error(`Failed to sign URL: ${error.message}`);
  return data.signedUrl;
}

module.exports = { uploadPhoto, signedUrl, BUCKET };
