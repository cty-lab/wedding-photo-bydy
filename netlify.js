const { google } = require('googleapis');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { filename, original, thumbnail } = JSON.parse(event.body);

    // 憑證初始化（資訊由 Netlify 後台環境變數帶入）
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/drive.file']
    );
    const drive = google.drive({ version: 'v3', auth });

    // 1. 將「原圖」寫入您的 Google Drive 原始資料夾
    const originalMetadata = {
      name: filename,
      parents: [process.env.GOOGLE_DRIVE_ORIGINAL_FOLDER_ID] 
    };
    const originalMedia = {
      mimeType: 'image/jpeg',
      body: Buffer.from(original, 'base64')
    };
    await drive.files.create({ resource: originalMetadata, media: originalMedia });

    // 2. 將「縮圖」寫入專門給網頁讀取的縮圖資料夾
    const thumbMetadata = {
      name: `thumb_${filename}`,
      parents: [process.env.GOOGLE_DRIVE_THUMB_FOLDER_ID]
    };
    const thumbMedia = {
      mimeType: 'image/jpeg',
      body: Buffer.from(thumbnail, 'base64')
    };
    await drive.files.create({ resource: thumbMetadata, media: thumbMedia });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' })
    };

  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};