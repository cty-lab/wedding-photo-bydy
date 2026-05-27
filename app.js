const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const photoGrid = document.getElementById('photo-grid');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxBy3alQR06O2h1Fgot3MzekdCVy__R7Eqdw91RS466QLhmnFpXPdofeMl4AGMdoQF3/exec';

fileInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;
  uploadStatus.innerText = `準備上傳 ${files.length} 張相片...`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    uploadStatus.innerText = `正在傳送第 (${i + 1}/${files.length}) 張相片，請勿關閉網頁...`;
    
    try {
      const filename = `${Date.now()}_${file.name}`;
      const originalBase64 = await toBase64(file);
      const thumbnailBase64 = await createThumbnail(file, 800, 0.7);

      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          filename: filename,
          original: originalBase64,
          thumbnail: thumbnailBase64
        })
      });

      const result = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.message || '後端處理失敗');
      }

      // 【核心修正】不依賴 Google 緩慢的索引，直接將收到的新照片 ID 貼上相片牆
      if (result.thumbId) {
        insertPhotoToGrid(result.thumbId);
      }

      if (i < files.length - 1) {
        uploadStatus.innerText = `第 ${i + 1} 張完成。系統冷卻中，準備傳下一張...`;
        await new Promise(res => setTimeout(res, 2000)); 
      }

    } catch (error) {
      console.error(error);
      uploadStatus.innerHTML = `<span style="color: red;">第 ${i + 1} 張相片上傳失敗。<br>原因: ${error.message}</span>`;
      return; 
    }
  }
  
  uploadStatus.innerText = '所有相片上傳成功！謝謝您的祝福。';
  // 移除原有的 fetchGallery() 呼叫，避免舊清單覆蓋剛貼上的新照片
});

// 新增：將單張照片直接插入相片牆最前方的功能
function insertPhotoToGrid(thumbId) {
  // 若原本畫面上有「目前還沒有照片」的提示，將其移除
  const emptyMsg = photoGrid.querySelector('p');
  if (emptyMsg) emptyMsg.remove();

  const item = document.createElement('div');
  item.className = 'photo-item';
  const img = document.createElement('img');
  img.src = `https://drive.google.com/thumbnail?id=${thumbId}&sz=w400`;
  img.alt = 'Wedding Photo';
  img.onerror = () => { img.src = ''; img.style.display = 'none'; };
  
  item.appendChild(img);
  item.onclick = () => openLightbox(thumbId);

  // 強制將新照片插入到網格的第一個位置
  if (photoGrid.firstChild) {
    photoGrid.insertBefore(item, photoGrid.firstChild);
  } else {
    photoGrid.appendChild(item);
  }
}

const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = error => reject(error);
});

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
    const noCacheUrl = `${GAS_URL}?t=${Date.now()}`;
    const response = await fetch(noCacheUrl);
    
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
