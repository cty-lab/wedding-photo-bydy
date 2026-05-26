const { google } = require('googleapis');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { filename, original, thumbnail } = JSON.parse(event.body);
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/drive.file']
    );
    const drive = google.drive({ version: 'v3', auth });

    // 寫入原圖
    await drive.files.create({
      resource: { name: filename, parents: [process.env.GOOGLE_DRIVE_ORIGINAL_FOLDER_ID] },
      media: { mimeType: 'image/jpeg', body: Buffer.from(original, 'base64') }
    });

    // 寫入縮圖
    await drive.files.create({
      resource: { name: `thumb_${filename}`, parents: [process.env.GOOGLE_DRIVE_THUMB_FOLDER_ID] },
      media: { mimeType: 'image/jpeg', body: Buffer.from(thumbnail, 'base64') }
    });

    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};