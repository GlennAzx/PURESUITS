import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';

/**
 * Crop a portrait to the tile window before it is uploaded.
 *
 * The tile window measures 194x281 on a leader tile: a ratio of 0.6899. Uploads
 * used to be stored untouched and cropped by `object-fit: cover`, which centres
 * the image and silently cut about 18% of the width off the shipped portraits.
 * This lets the person choose the frame instead, and exports at 480x696 - about
 * twice the rendered size - so a 6 MB phone photo becomes a small file.
 *
 * The preview and the export share one draw routine. The preview is a canvas of
 * exactly OUT_W x OUT_H CSS-scaled down, so what is framed is what is saved.
 */

const OUT_W = 480;
const OUT_H = 696; // 480/696 = 0.6897, the measured window ratio

export default function PortraitCropper({ file, onCancel, onDone }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const drag = useRef(null);

  // Load the file once. The object URL is revoked on cleanup, and a cancelled
  // flag stops the abandoned image's onerror from reporting a failure that
  // never happened - React re-runs this effect on mount in development, so the
  // first image is always revoked and its error handler would fire late.
  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      setReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setError('That file could not be read as an image.');
    };
    img.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const geometry = useCallback(
    (z, ox, oy) => {
      const img = imgRef.current;
      if (!img) return null;
      // scale 1 = the image covers the frame exactly on its tight axis.
      const base = Math.max(OUT_W / img.naturalWidth, OUT_H / img.naturalHeight);
      const eff = base * z;
      const dw = img.naturalWidth * eff;
      const dh = img.naturalHeight * eff;
      // Clamp so a gap can never appear at an edge.
      const maxX = Math.max(0, (dw - OUT_W) / 2);
      const maxY = Math.max(0, (dh - OUT_H) / 2);
      const cx = Math.min(maxX, Math.max(-maxX, ox));
      const cy = Math.min(maxY, Math.max(-maxY, oy));
      return { dw, dh, x: (OUT_W - dw) / 2 + cx, y: (OUT_H - dh) / 2 + cy };
    },
    []
  );

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const g = geometry(zoom, offset.x, offset.y);
    if (!g) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, OUT_W, OUT_H);
    ctx.drawImage(img, g.x, g.y, g.dw, g.dh);
  }, [geometry, zoom, offset]);

  useEffect(() => {
    if (ready) paint();
  }, [ready, paint]);

  // Re-clamp the stored offset when zoom changes, so zooming out cannot leave
  // the image off-centre with a gap.
  useEffect(() => {
    const g = geometry(zoom, offset.x, offset.y);
    if (!g) return;
    const nx = g.x - (OUT_W - g.dw) / 2;
    const ny = g.y - (OUT_H - g.dh) / 2;
    if (Math.abs(nx - offset.x) > 0.5 || Math.abs(ny - offset.y) > 0.5) {
      setOffset({ x: nx, y: ny });
    }
  }, [zoom, offset, geometry]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const canvas = canvasRef.current;
    // Pointer moves in CSS px; the geometry is in output px.
    const k = canvas ? OUT_W / canvas.getBoundingClientRect().width : 1;
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.x) * k,
      y: drag.current.oy + (e.clientY - drag.current.y) * k,
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.86));
      if (!blob) throw new Error('could not encode the crop');
      await onDone(blob);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-xl border border-imperial-gold/30 bg-ink-charcoal p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-ivory">Crop portrait</h3>
            <p className="mt-0.5 text-[10.5px] text-gray-500">
              Drag to position, zoom to fill. Saved at {OUT_W}×{OUT_H}.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded border border-imperial-gold/20 p-1 text-gray-500 transition-colors hover:border-imperial-gold/60 hover:text-imperial-gold"
          >
            <X size={13} />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={OUT_W}
          height={OUT_H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="mx-auto block w-[240px] cursor-grab touch-none rounded border border-imperial-gold/30 bg-ink-black active:cursor-grabbing"
          style={{ aspectRatio: `${OUT_W} / ${OUT_H}` }}
        />

        <label className="mt-3 flex items-center gap-2">
          <ZoomIn size={12} className="shrink-0 text-gray-500" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-imperial-gold"
            aria-label="Zoom"
          />
        </label>

        {error && <p className="mt-2 text-[10.5px] text-red-400">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-imperial-gold/20 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 transition-colors hover:border-imperial-gold/50 hover:text-imperial-gold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!ready || saving}
            className="rounded-md border border-jade-accent/50 bg-jade-accent/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-jade-accent transition-colors hover:border-jade-accent disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save portrait'}
          </button>
        </div>
      </div>
    </div>
  );
}
