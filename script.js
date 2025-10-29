// Elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const dropzone = document.getElementById('dropzone');
const qualityRange = document.getElementById('qualityRange');
const qualityVal = document.getElementById('qualityVal');
const bgColor = document.getElementById('bgColor');
const convertBtn = document.getElementById('convertBtn');
const previewWrap = document.getElementById('previewWrap');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');

let files = [];
let convertedItems = [];

// Helpers
function humanFileList(list){
  if(!list || list.length===0) return 'No file chosen';
  if(list.length===1) return list[0].name;
  return `${list.length} files selected`;
}

function clearAll(){
  files = [];
  convertedItems = [];
  fileInput.value = '';
  fileName.textContent = 'No file chosen';
  previewWrap.innerHTML = '';
}

function createPreviewCard(name, w, h, size, imgSrc, dataUrl){
  const wrap = document.createElement('div');
  wrap.className = 'preview';
  const img = document.createElement('img'); img.src = imgSrc; img.alt = name;
  const meta = document.createElement('div'); meta.className = 'meta';
  meta.innerHTML = `<strong>${name}</strong><br/>${w} x ${h}px • ${Math.round(size/1024)} KB`;

  const btn = document.createElement('button');
  btn.className = 'btn btn-download';
  btn.style.marginTop = '10px';
  btn.textContent = 'Download JPG';
  btn.addEventListener('click', ()=>{
    if(!dataUrl) return alert('Still processing');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name.replace(/\.png$/i,'.jpg');
    a.click();
  });

  wrap.appendChild(img);
  wrap.appendChild(meta);
  wrap.appendChild(btn);

  return wrap;
}

// Read files from input or drop
fileInput.addEventListener('change', (e)=>{
  files = Array.from(e.target.files || []);
  fileName.textContent = humanFileList(files);
  previewWrap.innerHTML = '';
  files.forEach(f=>{
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = ()=>{
      const card = createPreviewCard(f.name, img.width, img.height, f.size, url, null);
      previewWrap.appendChild(card);
    };
    img.src = url;
  });
});

// Dropzone behaviour
['dragenter','dragover'].forEach(evt=>{
  dropzone.addEventListener(evt, e=>{
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add('dragover');
  });
});

['dragleave','drop'].forEach(evt=>{
  dropzone.addEventListener(evt, e=>{
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('click', ()=> fileInput.click());

dropzone.addEventListener('drop', (e)=>{
  const dt = e.dataTransfer; if(!dt) return;
  files = Array.from(dt.files).filter(f=>f.type==='image/png');
  fileName.textContent = humanFileList(files);
  previewWrap.innerHTML = '';
  files.forEach(f=>{
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = ()=>{
      const card = createPreviewCard(f.name, img.width, img.height, f.size, url, null);
      previewWrap.appendChild(card);
    };
    img.src = url;
  });
});

// Quality display
qualityRange.addEventListener('input', ()=>{
  qualityVal.textContent = Number(qualityRange.value).toFixed(2);
});

// Convert logic
async function convertAll(){
  if(!files || files.length===0) return alert('Select PNG files first');
  convertedItems = [];
  previewWrap.innerHTML = '';

  for(const f of files){
    const url = URL.createObjectURL(f);
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor.value || '#ffffff';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(img,0,0);
    const q = parseFloat(qualityRange.value) || 0.9;
    const dataUrl = canvas.toDataURL('image/jpeg', q);
    const blob = dataURLToBlob(dataUrl);
    convertedItems.push({name:f.name, dataUrl, blob});

    const card = createPreviewCard(f.name, img.width, img.height, blob.size, dataUrl, dataUrl);
    previewWrap.appendChild(card);
    URL.revokeObjectURL(url);
  }

  alert('Conversion complete — previews ready below. Use Download buttons or Download All.');
}

function loadImage(url){
  return new Promise((res,rej)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>res(img);
    img.onerror = rej;
    img.src = url;
  });
}

function dataURLToBlob(dataurl){
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while(n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8],{type:mime});
}

// Buttons
convertBtn.addEventListener('click', ()=> convertAll());
clearBtn.addEventListener('click', ()=> clearAll());

copyBtn.addEventListener('click', async()=>{
  if(!convertedItems || convertedItems.length===0) return alert('No converted image found. Convert first.');
  try {
    await navigator.clipboard.writeText(convertedItems[0].dataUrl);
    alert('First JPG (base64) copied to clipboard');
  } catch (err) {
    alert('Copy failed — see console'); console.error(err);
  }
});

downloadAllBtn.addEventListener('click', async ()=>{
  if(!convertedItems || convertedItems.length===0) return alert('No converted files to download');
  if(window.JSZip){
    const zip = new JSZip();
    convertedItems.forEach(item=>{
      const name = item.name.replace(/\.png$/i,'.jpg');
      zip.file(name, item.blob);
    });
    const content = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = 'converted_images.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  } else {
    convertedItems.forEach(item=>{
      const a = document.createElement('a');
      a.href = item.dataUrl;
      a.download = item.name.replace(/\.png$/i,'.jpg');
      a.click();
    });
  }
});

// Initialize
clearAll();
