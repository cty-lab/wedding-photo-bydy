const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const photoGrid = document.getElementById('photo-grid');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbz3iHJtyPFj8pYA8K8tZxP-iFJgmXbs9R_DXSUeMquzehbhJEgUoJkn2__F0uA21KHx/exec';

fileInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;
  uploadStatus.innerText = `準備上傳 ${files.length} 張相片...`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    uploadStatus.innerText = `正在傳送第 (${i + 1}/${files.length}) 張相片，請勿關閉網頁...`;
    try {
      const filename = `${Date.now()}_${file.name}`;

      // 第一次請求：縮圖（800px）存到 Thumbnails，相片牆顯示用
      const thumbnailBase64 = await createThumbnail(file, 800, 0.7);
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          type: 'thumbnail',
          filename: filename,
          thumbnail: thumbnailBase64
        })
      });

      // 第二次請求：原始檔案不壓縮，存到 Originals 收藏用
      const originalBase64 = await toBase64(file);
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          type: 'original',
          filename: filename,
          original: originalBase64
        })
      });

    } catch (error) {
      console.error(error);
      uploadStatus.innerText = `第 ${i + 1} 張相片上傳失敗，請稍後再試。`;
      return;
    }
  }
  uploadStatus.innerText = '所有相片上傳成功！謝謝您的祝福 🎉';
  fetchGallery();
});

// 原始檔案，完全不壓縮
const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = error => reject(error);
});

// 縮圖，用於相片牆顯示
const createThumbnail = (file, targetWidth, quality) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = Math.min(img.width, targetWidth);
      const scaleFactor = width / img.width;
      canvas.width = width;
      canvas.height = img.height * scaleFactor;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
  };
});

async function fetchGallery() {
  try {
    const response = await fetch(GAS_URL);
    const photos = await response.json();
    photoGrid.innerHTML = '';

    if (!photos.length) {
      photoGrid.innerHTML = '<p style="text-align:center;opacity:0.5;grid-column:1/-1">目前還沒有照片，快來上傳第一張吧！</p>';
      return;
    }

    photos.forEach(photo => {
      const item = document.createElement('div');
      item.className = 'photo-item';
      const img = document.createElement('img');
      img.src = `https://drive.google.com/thumbnail?id=${photo.thumbId}&sz=w400`;
      img.alt = 'Wedding Photo';
      img.onerror = () => { img.src = ''; img.style.display = 'none'; };
      item.appendChild(img);
      item.onclick = () => openLightbox(photo.thumbId);
      photoGrid.appendChild(item);
    });
  } catch (error) {
    console.error('無法載入相片牆', error);
    photoGrid.innerHTML = '<p style="text-align:center;opacity:0.5;grid-column:1/-1">載入失敗，請重新整理頁面。</p>';
  }
}

function openLightbox(thumbId) {
  const lightboxImg = document.getElementById('lightbox-img');
  lightboxImg.src = `https://drive.google.com/thumbnail?id=${thumbId}&sz=w1200`;
  document.getElementById('lightbox').style.display = 'flex';
}

function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

window.onload = fetchGallery;
