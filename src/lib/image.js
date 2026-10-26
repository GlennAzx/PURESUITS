/**
 * Prepare a screenshot for the gallery: a full image plus a small thumbnail.
 *
 * Phone screenshots arrive at 3000x1500 and several megabytes. A gallery grid
 * that loads those at full size is what made opening an album feel slow: every
 * photo was decoded and painted at full resolution at once.
 *
 * So each upload produces two files:
 *   full  - 1440 px long edge, WebP q0.76, opened only when a photo is clicked
 *   thumb - 480 px long edge,  WebP q0.72, used in every grid
 *
 * The thumbnail is roughly 20-40 KB, so a 40-photo album costs about a
 * megabyte to browse instead of forty.
 *
 * GIFs are passed through untouched: drawing an animated GIF to a canvas keeps
 * one frame and throws the animation away.
 */

const DEFAULTS = {
  // 1440 rather than 1920. A 1920x1080 screenshot lands near 500-700 KB; the
  // same frame at 1440 is about 300 KB and looks the same on a laptop, which is
  // where the lightbox is read. On a slow connection that difference is the
  // wait, not the pixels.
  maxEdge: 1440,
  quality: 0.76,
  thumbEdge: 480,
  thumbQuality: 0.72,
};

function loadImage(file) {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('that file could not be read as an image'));
    };
    img.src = url;
  });
}

function drawTo(img, edge, quality) {
  const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  // Neither WebP nor JPEG has alpha, so flatten onto white rather than letting
  // transparent PNG areas turn black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // WebP first: screenshots are flat colour and text, where it is typically a
  // quarter to a third smaller than JPEG at the same visual quality.
  return new Promise((resolve) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === 'image/webp') {
          resolve({ blob: webp, width, height });
          return;
        }
        // Browser refused WebP (it hands back PNG). Fall back to JPEG.
        canvas.toBlob(
          (jpeg) => resolve(jpeg ? { blob: jpeg, width, height } : null),
          'image/jpeg',
          quality
        );
      },
      'image/webp',
      quality
    );
  });
}

/**
 * @param {File} file
 * @param {Partial<typeof DEFAULTS>} [opts]
 * @returns {Promise<{full: Blob, thumb: Blob, width: number, height: number, compressed: boolean}>}
 */
export async function processImage(file, opts = {}) {
  const o = { ...DEFAULTS, ...opts };

  if (file.type === 'image/gif' || !file.type.startsWith('image/')) {
    return { full: file, thumb: file, width: 0, height: 0, compressed: false };
  }

  const { img, url } = await loadImage(file);
  try {
    const [full, thumb] = await Promise.all([
      drawTo(img, o.maxEdge, o.quality),
      drawTo(img, o.thumbEdge, o.thumbQuality),
    ]);

    // A small PNG can compress to something bigger. Keep whichever is smaller,
    // but never upload more bytes than the file that was chosen.
    const keepOriginal = !full || full.blob.size >= file.size;
    const fullBlob = keepOriginal ? file : full.blob;
    const thumbBlob = thumb?.blob || fullBlob;

    return {
      full: fullBlob,
      thumb: thumbBlob,
      width: full?.width || img.naturalWidth,
      height: full?.height || img.naturalHeight,
      compressed: !keepOriginal,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Single-size compression, kept for callers that only need one file. */
export async function compressImage(file, opts = {}) {
  const { full, width, height, compressed } = await processImage(file, opts);
  return { blob: full, width, height, compressed };
}

/** Format a byte count for the admin usage line. */
export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
