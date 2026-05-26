const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const photoGrid = document.getElementById('photo-grid');

// 監聽上傳動作
fileInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;

  uploadStatus.innerText = `準備上傳 ${files.length} 張相片...`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    uploadStatus.innerText = `正在傳送第 (${i + 1}/${files.length}) 張相片，請勿關閉網頁...`;

    try {
      const originalBase64 = await toBase64(file);
      const thumbnailBase64 = await createThumbnail(file, 400);

      const response = await fetch('https://script.google.com/macros/s/AKfycbx4AgBveM1ToVjv5U08qhV3qnt4qngZGTCXZf1XvzrQxLru0jbumrSblRJ8IsxpBxWK/exec', {
        method: 'POST',
        // 【修改點】將 Content-Type 更改為 text/plain 以繞過 Google 的 CORS 阻擋
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          filename: `${Date.now()}_${file.name}`,
          original: originalBase64,
          thumbnail: thumbnailBase64
        })
      });

      if (!response.ok) throw new Error('Upload failed');

    } catch (error) {
      console.error(error);
      uploadStatus.innerText = `第 ${i + 1} 張相片上傳失敗，請稍後再試。`;
      return;
    }
  }

  uploadStatus.innerText = '所有相片上傳成功！謝謝您的祝福。';
  fetchGallery();
});

// 轉 Base64 工具
const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = error => reject(error);
});

// 縮圖產生器
const createThumbnail = (file, targetWidth) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.