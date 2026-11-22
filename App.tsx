import React, { useState, useEffect, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import Overlay from './components/Overlay';
import HandController from './components/HandController';
import InstagramModal from './components/InstagramModal';
import { generatePhotoPositions } from './utils/math';
import { ControlMode, PhotoData, InteractionMode } from './types';
import { DEFAULT_PHOTOS_COUNT, PLACEHOLDER_TYPES, DEFAULT_USER_NAME } from './constants';
import { useAudio } from './hooks/useAudio';
import { useRecording } from './hooks/useRecording';
import { useInstagram } from './hooks/useInstagram';
import { useTreeInteraction } from './hooks/useTreeInteraction';
import { useVisitCounter } from './hooks/useVisitCounter';
import { processImageWithPadding } from './utils/image';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { get, set } from 'idb-keyval';
import { DEFAULT_MEDIA } from './defaultMedia';

const STORE_KEY = 'lumiere-tree-v3'; // bump the number to force everyone back to the defaults
const MAX_VIDEO_MB = 50;

const serializePhotos = (photos: PhotoData[]) =>
  Promise.all(
    photos.map(async (p) => {
      if (p.url.startsWith('blob:')) {
        const blob = await (await fetch(p.url)).blob();
        return { ...p, url: '', blob };
      }
      return p;
    })
  );

const deserializePhotos = (saved: any[]): PhotoData[] =>
  saved.map(({ blob, ...p }) => (blob ? { ...p, url: URL.createObjectURL(blob) } : p));

const buildMedia = async (file: File) => {
  if (file.type.startsWith('video/')) {
    return { url: URL.createObjectURL(file), mediaType: 'video' as const };
  }
  const rawUrl = URL.createObjectURL(file);
  const url = await processImageWithPadding(rawUrl);
  if (url !== rawUrl) URL.revokeObjectURL(rawUrl);
  return { url, mediaType: 'image' as const };
};

const App: React.FC = () => {
  const [controlMode, setControlMode] = useState<ControlMode>(ControlMode.MOUSE);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.VIEW);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [userName, setUserName] = useState(DEFAULT_USER_NAME);
  const [isNameSet, setIsNameSet] = useState(true); // true hides the "What's your name?" prompt
  const [isHandReady, setIsHandReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const visitCount = useVisitCounter();

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize Photos (saved tree first, otherwise defaults)
  useEffect(() => {
    (async () => {
      try {
        const saved = await get(STORE_KEY);
        if (saved && saved.length) {
          setPhotos(deserializePhotos(saved));
          setLoaded(true);
          return;
        }
      } catch (e) {
        console.warn('Could not load saved tree', e);
      }

      const positions = generatePhotoPositions(DEFAULT_PHOTOS_COUNT);
      const types = Object.values(PLACEHOLDER_TYPES);
      const step = 2; // media in every 2nd slot, starting at the first one
      const initialPhotos: PhotoData[] = positions.map((pos, index) => {
        const media = index % step === 0 ? DEFAULT_MEDIA[index / step] : undefined;
        return {
          id: `photo-${index}`,
          url: media ? media.src : '',
          mediaType: media ? media.type : undefined,
          caption: media?.caption,
          placeholderType: types[index % types.length],
          position: pos.position,
          rotation: pos.rotation
        };
      });
      setPhotos(initialPhotos);
      setLoaded(true);
    })();
  }, []);

  // Save every change
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(async () => {
      try {
        await set(STORE_KEY, await serializePhotos(photos));
      } catch (e) {
        console.warn('Could not save tree', e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [photos, loaded]);

  // Caption edits sent from the 3D polaroids
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, caption } = (e as CustomEvent<{ id: string; caption: string }>).detail;
      setPhotos(prev => prev.map(p => (p.id === id ? { ...p, caption } : p)));
    };
    window.addEventListener('photo-caption', handler);
    return () => window.removeEventListener('photo-caption', handler);
  }, []);

  // Custom Hooks
  const { isMusicPlaying, toggleMusic, audioRef } = useAudio();
  const { isRecording, recordingType, handleRecordVideo } = useRecording(photos, (msg) => showToast(msg, 'error'));
  const {
    isInstaModalOpen,
    setIsInstaModalOpen,
    instaLoading,
    instaStatus,
    handleInstagramSubmit
  } = useInstagram({ 
    photos, 
    setPhotos,
    onComplete: (lastPhoto) => {
      setInteractionMode(InteractionMode.VIEW);
      handlePhotoClick(lastPhoto);
    },
    onError: (message) => showToast(message, 'error')
  });

  const {
    zoomLevel,
    setZoomLevel,
    focusedPhoto,
    setFocusedPhoto,
    isExploded,
    panOffset,
    handleGesture,
    handlePhotoClick,
    handleNextPhoto,
    handlePrevPhoto,
    scrollToTop
  } = useTreeInteraction({
    photos,
    interactionMode,
    isInstaModalOpen,
    isRecording
  });

  // Request Camera permissions when switching to hand mode
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    if (controlMode === ControlMode.HAND) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          currentStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsHandReady(true);
          }
        })
        .catch((err) => {
          console.error("Camera denied:", err);
          showToast("Please enable camera access for hand gestures.", 'error');
          setControlMode(ControlMode.MOUSE);
        });
    } else {
      // Stop stream if exists
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setIsHandReady(false);
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [controlMode]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isInstaModalOpen) return;

    // Prevent zooming out when interacting with UI
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) {
      return;
    }

    scrollToTop();
  };

  const handleSingleUpload = async (id: string, file: File) => {
    if (file.type.startsWith('video/') && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      showToast(`Videos must be under ${MAX_VIDEO_MB} MB.`, 'error');
      return;
    }
    const media = await buildMedia(file);
    const photoToUpdate = photos.find(p => p.id === id);
    if (photoToUpdate) {
      const updatedPhoto = { ...photoToUpdate, ...media };
      setPhotos(prev => prev.map(p => (p.id === id ? updatedPhoto : p)));
      setInteractionMode(InteractionMode.VIEW);
      handlePhotoClick(updatedPhoto);
    }
  };

  const handleBulkUpload = async (files: FileList) => {
    const all = Array.from(files);
    const newFiles = all.filter(f => !(f.type.startsWith('video/') && f.size > MAX_VIDEO_MB * 1024 * 1024));
    if (newFiles.length < all.length) showToast(`Skipped videos over ${MAX_VIDEO_MB} MB.`, 'error');

    const newPhotos = [...photos];
    // Fill empty slots first (top to bottom); defaults are only replaced once no empty slots remain
    const sortedIndices = newPhotos
      .map((p, i) => ({ y: p.position[1], index: i, filled: p.url ? 1 : 0 }))
      .sort((a, b) => a.filled - b.filled || b.y - a.y)
      .map(item => item.index);

    let fileIndex = 0;
    let lastAddedPhoto: PhotoData | null = null;

    for (const index of sortedIndices) {
      if (fileIndex >= newFiles.length) break;
      const media = await buildMedia(newFiles[fileIndex]);
      newPhotos[index] = { ...newPhotos[index], ...media };
      lastAddedPhoto = newPhotos[index];
      fileIndex++;
    }

    setPhotos(newPhotos);
    if (lastAddedPhoto) {
      setInteractionMode(InteractionMode.VIEW);
      handlePhotoClick(lastAddedPhoto);
    }
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (focusedPhoto?.id === id) {
      setFocusedPhoto(null);
    }
  };

  return (
    <div
      className="relative w-full h-full bg-[#050505]"
      onDoubleClick={handleDoubleClick}
    >
      <audio
        ref={audioRef}
        src="/assets/music/christmas-song.mp3"
        loop
        preload="auto"
      />

      <Scene
        photos={photos}
        onUpload={handleSingleUpload}
        onPhotoClick={handlePhotoClick}
        onDelete={handleDeletePhoto}
        controlMode={controlMode}
        interactionMode={interactionMode}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        focusedPhoto={focusedPhoto}
        isExploded={isExploded}
        isRecording={isRecording}
        recordingType={recordingType}
        userName={userName}
      />

      <Overlay
        controlMode={controlMode}
        setControlMode={setControlMode}
        interactionMode={interactionMode}
        setInteractionMode={setInteractionMode}
        onBulkUpload={handleBulkUpload}
        onOpenInstagram={() => setIsInstaModalOpen(true)}
        onNext={handleNextPhoto}
        onPrev={handlePrevPhoto}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        isHandReady={isHandReady}
        isMusicPlaying={isMusicPlaying}
        toggleMusic={toggleMusic}
        userName={userName}
        setUserName={setUserName}
        isNameSet={isNameSet}
        setIsNameSet={setIsNameSet}
        onRecordVideo={handleRecordVideo}
        isRecording={isRecording}
        isExploded={isExploded}
        visitCount={visitCount}
      />

      <InstagramModal
        isOpen={isInstaModalOpen}
        onClose={() => setIsInstaModalOpen(false)}
        onSubmit={handleInstagramSubmit}
        isLoading={instaLoading}
        statusMessage={instaStatus}
      />

      <HandController
        mode={controlMode}
        zoomLevel={zoomLevel}
        isExploded={isExploded}
        onGesture={handleGesture}
        videoRef={videoRef}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className={`min-w-[300px] max-w-md p-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
            toast.type === 'error' 
              ? 'bg-red-950/40 border-red-500/30 text-red-100' 
              : 'bg-green-950/40 border-green-500/30 text-green-100'
          } flex items-start gap-4 relative overflow-hidden group`}>
            {/* Progress bar background */}
            <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full" />
            {/* Animated progress bar */}
            <div className={`absolute bottom-0 left-0 h-1 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'} animate-[shrink_5s_linear_forwards]`} />
            
            <div className={`p-2 rounded-xl ${toast.type === 'error' ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              )}
            </div>
            
            <div className="flex-1 pt-0.5">
              <h4 className="text-sm font-bold tracking-tight mb-1">
                {toast.type === 'error' ? 'Something went wrong' : 'Success!'}
              </h4>
              <p className="text-xs text-white/70 leading-relaxed font-medium">
                {toast.message}
              </p>
            </div>

            <button 
              onClick={() => setToast(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <Analytics />
    </div>
  );
};

export default App;