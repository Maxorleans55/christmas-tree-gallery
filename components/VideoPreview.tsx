import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';

interface VideoPreviewProps {
  url: string;
  caption?: string;
  onClose: () => void;
}

const fmt = (s: number) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const VideoPreview: React.FC<VideoPreviewProps> = ({ url, caption, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Start playing with sound (the click that opened this counts as a user gesture)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  }, [url]);

  // Keyboard: Esc closes, Space plays/pauses
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    setTime(v.currentTime);
  };

  const fullscreen = () => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => {});
  };

  const replay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  const progress = duration ? (time / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[min(92vw,420px)] max-h-[92vh] flex flex-col rounded-[28px] overflow-hidden border border-[#f2e24e]/40 bg-[#0b0f0c] shadow-[0_0_60px_rgba(242,226,78,0.25)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 bg-gradient-to-b from-white/10 to-transparent">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#f2e24e]/80">Our memory</p>
            <h3 className="text-white text-lg truncate" style={{ fontFamily: "'Great Vibes', cursive" }}>
              {caption || 'Merry Christmas'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video */}
        <div className="relative bg-black flex-1 min-h-0 flex items-center justify-center" onClick={toggle}>
          <video
            ref={videoRef}
            src={url}
            playsInline
            loop
            className="max-h-[65vh] w-full object-contain"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur border border-white/30 flex items-center justify-center">
                <Play className="w-7 h-7 text-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-5 pt-3 pb-4 bg-gradient-to-t from-white/10 to-transparent">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={seek}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#f2e24e]"
            style={{
              background: `linear-gradient(to right, #f2e24e ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
            }}
          />
          <div className="flex items-center justify-between mt-3 text-white/90">
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="p-2.5 rounded-full bg-[#f2e24e] text-black hover:scale-105 transition-transform" title="Play / Pause (Space)">
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button onClick={replay} className="p-2 rounded-full hover:bg-white/10" title="Replay">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={toggleMute} className="p-2 rounded-full hover:bg-white/10" title="Sound">
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <span className="text-xs tabular-nums text-white/70 ml-1">
                {fmt(time)} / {fmt(duration)}
              </span>
            </div>
            <button onClick={fullscreen} className="p-2 rounded-full hover:bg-white/10" title="Fullscreen">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
