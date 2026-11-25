import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
//  The playlist. Put your music files in  public/assets/music/  and list them
//  here. They play in order, then start again from the top. A file that is
//  missing is skipped automatically.
// ---------------------------------------------------------------------------
export const MUSIC_TRACKS = [
    '/assets/music/its-beginning-to-look-a-lot-like-christmas.mp3',
    '/assets/music/all-i-want-for-christmas-is-you.mp3',
    '/assets/music/christmas-song.mp3',
];

export const useAudio = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [trackIndex, setTrackIndex] = useState(0);
    const trackRef = useRef(0);
    const failures = useRef(0);
    const wantPlay = useRef(true);

    const loadTrack = (audio: HTMLAudioElement, i: number, play: boolean) => {
        trackRef.current = i;
        setTrackIndex(i);
        audio.src = MUSIC_TRACKS[i];
        audio.load();
        if (play) audio.play().then(() => setIsMusicPlaying(true)).catch(() => {});
    };

    const nextTrack = () => {
        const audio = audioRef.current;
        if (!audio) return;
        loadTrack(audio, (trackRef.current + 1) % MUSIC_TRACKS.length, wantPlay.current);
    };

    // Playlist: play in order, skip missing files
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.loop = false;
        loadTrack(audio, 0, false);

        const onEnded = () => {
            failures.current = 0;
            loadTrack(audio, (trackRef.current + 1) % MUSIC_TRACKS.length, true);
        };
        const onError = () => {
            failures.current += 1;
            if (failures.current >= MUSIC_TRACKS.length) {
                setIsMusicPlaying(false); // nothing could be loaded
                return;
            }
            loadTrack(audio, (trackRef.current + 1) % MUSIC_TRACKS.length, wantPlay.current);
        };
        const onPlaying = () => {
            failures.current = 0;
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);
        audio.addEventListener('playing', onPlaying);
        return () => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('playing', onPlaying);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = 0.8;

        const attemptPlay = async () => {
            try {
                await audio.play();
                console.log("Audio started successfully");
                setIsMusicPlaying(true);
                removeListeners();
            } catch (err) {
                console.log("Playback blocked, waiting for interaction");
            }
        };

        const removeListeners = () => {
            window.removeEventListener('pointerdown', attemptPlay);
            window.removeEventListener('keydown', attemptPlay);
        };

        // Listen for any interaction on the window
        window.addEventListener('pointerdown', attemptPlay);
        window.addEventListener('keydown', attemptPlay);

        // Also try immediately (might work if already interacted)
        attemptPlay();

        return removeListeners;
    }, []);

    // Pause the music when another app (the snow globe) takes over, resume when we come back
    const resumeOnReturn = useRef(false);
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const stop = () => {
            if (!audio.paused) {
                resumeOnReturn.current = true;
                audio.pause();
                setIsMusicPlaying(false);
            }
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible' && resumeOnReturn.current) {
                resumeOnReturn.current = false;
                audio.play().then(() => setIsMusicPlaying(true)).catch(() => {});
            }
        };

        window.addEventListener('stop-music', stop);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener('stop-music', stop);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    const toggleMusic = () => {
        if (!audioRef.current) return;

        if (!audioRef.current.paused) {
            wantPlay.current = false;
            audioRef.current.pause();
            setIsMusicPlaying(false);
        } else {
            wantPlay.current = true;
            audioRef.current.play()
                .then(() => setIsMusicPlaying(true))
                .catch(err => console.error("Toggle play failed:", err));
        }
    };

    return {
        audioRef,
        isMusicPlaying,
        toggleMusic,
        nextTrack,
        trackIndex
    };
};
