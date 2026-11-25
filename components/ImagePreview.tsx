import React, { useEffect, useRef, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface Shown { url: string; caption?: string; }

/**
 * Opens a photo full-size when a polaroid is clicked.
 * Listens for the 'image-preview' window event, so it needs no props.
 */
const ImagePreview: React.FC = () => {
  const [img, setImg] = useState<Shown | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const open = (e: Event) => {
      setImg((e as CustomEvent<Shown>).detail);
      setZoomed(false);
      setFailed(false);
    };
    window.addEventListener('image-preview', open);
    return () => window.removeEventListener('image-preview', open);
  }, []);

  useEffect(() => {
    if (!img) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImg(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [img]);

  if (!img) return null;

  const fileName = (img.caption || 'our-memory').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'our-memory';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={img.caption || 'Photo preview'}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onClick={() => setImg(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[min(92vw,520px)] max-h-[92vh] flex flex-col rounded-[28px] overflow-hidden border border-[#f2e24e]/40 bg-[#0b0f0c] shadow-[0_0_60px_rgba(242,226,78,0.25)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 bg-gradient-to-b from-white/10 to-transparent">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#f2e24e]/80">Our memory</p>
            <h3 className="text-white text-lg truncate" style={{ fontFamily: "'Great Vibes', cursive" }}>
              {img.caption || 'Merry Christmas'}
            </h3>
          </div>
          <button
            ref={closeRef}
            onClick={() => setImg(null)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f2e24e]"
            title="Close (Esc)"
            aria-label="Close photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Photo (tap to zoom) */}
        <div className="relative bg-black flex-1 min-h-0 overflow-auto flex items-center justify-center">
          {failed ? (
            <div className="px-6 py-16 text-center" role="alert">
              <p className="text-white text-sm">This photo couldn't be shown.</p>
            </div>
          ) : (
            <img
              src={img.url}
              alt={img.caption || 'Photo'}
              onError={() => setFailed(true)}
              onClick={() => setZoomed((z) => !z)}
              draggable={false}
              className={`select-none transition-all duration-200 ${
                zoomed ? 'max-w-none w-[180%] cursor-zoom-out' : 'max-h-[70vh] w-full object-contain cursor-zoom-in'
              }`}
            />
          )}
        </div>

        {/* Controls */}
        <div
          className="flex items-center justify-between px-5 pt-3 pb-4 bg-gradient-to-t from-white/10 to-transparent text-white/90"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => setZoomed((z) => !z)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full hover:bg-white/10 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f2e24e]"
            aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
          >
            {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            {zoomed ? 'Zoom out' : 'Zoom in'}
          </button>
          <a
            href={img.url}
            download={`${fileName}.jpg`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#f2e24e] text-black text-sm font-semibold hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Save photo"
          >
            <Download className="w-4 h-4" />
            Save
          </a>
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;
