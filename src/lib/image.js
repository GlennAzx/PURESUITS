/**
 * Shrink a screenshot before upload.
 *
 * Phone screenshots arrive at 3000x1500 and several megabytes. The gallery
 * renders them in 16:9 tiles about 400 px wide, so the extra pixels cost storage
 * on the R2 free tier (10 GB) and bandwidth for no visible gain.
 *
 * A 1920 px long edge at JPEG q0.82 keeps a screenshot legible when opened full
 * size and typically lands at 150-500 KB, roughly a tenth of the original.
 *
 * GIFs are passed through untouched: drawing an animated GIF to a canvas keeps
 * one frame and throws the animation away.
 *
 * @param {File} file
 * @param {{maxEdge?: number, quality?: number}} [opts]
 * @returns {Promise<{blob: Blob, width: number, height: number, compressed: boolean}>}
 */
export async function compressImage(file, { maxEdge = 1920, quality = 0.82 } = {}) {
  const original = { blob: file, width: 0, height: 0, compressed: false };

  if (file.type === 'image/gif') return original;
  if (!file.type.startsWith('image/')) return original;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('that file could not be read as an image'));
      el.src = url;
    });

    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // JPEG has no alpha, so flatten onto white rather than letting transparent
    // PNG areas turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

    // A small PNG can compress to something bigger. Keep whichever is smaller,
    // but never upload more bytes than the file that was chosen.
    if (!blob || blob.size >= file.size) {
      return { blob: file, width: img.naturalWidth, height: img.naturalHeight, compressed: false };
    }
    return { blob, width, height, compressed: true };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Format a byte count for the admin usage line. */
export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
