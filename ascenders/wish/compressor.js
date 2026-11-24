/**
 * Adaptive client-side Canvas image compressor for Twisted23.com.
 * Guarantees compressed WebP/JPEG output is <= targetMaxBytes (e.g. 575 KB, 385 KB, or 57 KB)
 * BEFORE sending bytes over Hostinger's upload/egress pipe.
 */

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read compressed image."));
    reader.onload = () => {
      const res = String(reader.result || "");
      resolve(res.includes(",") ? res.split(",", 2)[1] : res);
    };
    reader.readAsDataURL(blob);
  });
}

export async function compressDataUrlToBudget(dataUrl, { maxBytes = 575 * 1024, scaleFactor = 1 } = {}) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode image for compression."));
    el.src = dataUrl;
  });

  const safeScale = Number.isFinite(scaleFactor) && scaleFactor > 0 && scaleFactor <= 1 ? scaleFactor : 1;
  const baseW = Math.max(1, Math.round(img.naturalWidth * safeScale));
  const baseH = Math.max(1, Math.round(img.naturalHeight * safeScale));
  const maxEdges = [2048, 1600, 1280, 960, 720, 480, 320];
  const mimes = ["image/webp", "image/jpeg"];
  let bestBlob = null;
  let usedWidth = baseW;
  let usedHeight = baseH;

  for (const edge of maxEdges) {
    const scale = Math.min(1, edge / Math.max(baseW, baseH));
    const w = Math.max(1, Math.round(baseW * scale));
    const h = Math.max(1, Math.round(baseH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    for (const mime of mimes) {
      let lo = 0.32;
      let hi = 0.92;
      let candidate = await canvasToBlob(canvas, mime, hi);
      if (!candidate || !candidate.type.startsWith("image/")) continue;
      if (candidate.size <= maxBytes) {
        usedWidth = w;
        usedHeight = h;
        const dataBase64 = await blobToBase64(candidate);
        return {
          blob: candidate,
          dataBase64,
          mime: candidate.type,
          bytes: candidate.size,
          width: w,
          height: h,
        };
      }

      // Binary search quality
      for (let iter = 0; iter < 5; iter++) {
        const mid = (lo + hi) / 2;
        const probe = await canvasToBlob(canvas, mime, mid);
        if (!probe) break;
        if (probe.size <= maxBytes) {
          bestBlob = probe;
          usedWidth = w;
          usedHeight = h;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      if (bestBlob && bestBlob.size <= maxBytes) {
        const dataBase64 = await blobToBase64(bestBlob);
        return {
          blob: bestBlob,
          dataBase64,
          mime: bestBlob.type,
          bytes: bestBlob.size,
          width: usedWidth,
          height: usedHeight,
        };
      }
    }
  }

  throw new Error(`Could not compress image under ${(maxBytes / 1024).toFixed(0)} KB.`);
}
