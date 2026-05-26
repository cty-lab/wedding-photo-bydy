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

      const response = await fetch('/.netlify/functions/upload-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const scaleFactor = targetWidth / img.width;
      canvas.width = targetWidth;
      canvas.height = img.height * scaleFactor;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
    };
  };
});

// 撈取雲端照片
async function fetchGallery() {
  try {
    const response = await fetch('/.netlify/functions/get-gallery');
    const photos = await response.json();
    
    photoGrid.innerHTML = '';
    photos.forEach(photo => {
      const item = document.createElement('div');
      item.className = 'photo-item';
      item.innerHTML = `<img src="${photo.thumbUrl}" alt="Wedding Photo">`;
      item.onclick = () => openLightbox(photo.origUrl);
      photoGrid.appendChild(item);
    });
  } catch (error) {
    console.error('無法載入相片牆', error);
  }
}

// 燈箱控制
function openLightbox(url) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  lightboxImg.src = url;
  lightbox.style.display = 'flex';
}

function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

window.onload = fetchGallery;