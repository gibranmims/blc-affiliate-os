const { google } = require('googleapis');

function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var is not set');
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  return google.drive({ version: 'v3', auth });
}

// Create a per-customer folder inside the root BBL Challenge folder.
// Returns the new folder's Drive ID.
async function createCustomerFolder(name, email) {
  const drive = getDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID env var is not set');

  const folderName = `${name} - ${email}`;
  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId]
    },
    fields: 'id'
  });
  return res.data.id;
}

// Upload a buffer to an existing Drive folder.
// Returns the Drive file ID.
async function uploadPhoto(folderId, buffer, filename, mimeType) {
  const drive = getDriveClient();
  const { Readable } = require('stream');
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId]
    },
    media: {
      mimeType: mimeType || 'image/jpeg',
      body: stream
    },
    fields: 'id'
  });
  return res.data.id;
}

module.exports = { createCustomerFolder, uploadPhoto };
