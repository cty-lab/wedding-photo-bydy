const { google } = require('googleapis');

exports.handler = async (event, context) => {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/drive.readonly']
    );
    const drive = google.drive({ version: 'v3', auth });

    const thumbRes = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_THUMB_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'createdTime desc'
    });

    const origRes = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_ORIGINAL_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)'
    });

    const originalsMap = {};
    origRes.data.files.forEach(f => { originalsMap[f.name] = f.id; });

    const photos = thumbRes.data.files.map(f => {
      const origName = f.name.replace('thumb_', '');
      const origId = originalsMap[origName] || f.id;
      return {
        thumbUrl: `https://drive.google.com/uc?export=view&id=${f.id}`,
        origUrl: `https://drive.google.com/uc?export=view&id=${origId}`
      };
    });

    return { statusCode: 200, body: JSON.stringify(photos) };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};