import { useState, useRef } from 'react';
import { PhotoData } from '../types';

export const useRecording = (photos: PhotoData[], onError?: (message: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingType, setRecordingType] = useState<'FULL' | 'ALBUM' | null>(null);

    // Lets the Stop button end a tour early
    const recorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stoppedEarlyRef = useRef(false);

    const handleRecordVideo = (type: 'FULL' | 'ALBUM') => {
        if (isRecording) return;
        stoppedEarlyRef.current = false;

        // Set flags first so HUD + overlays render before we capture the stream
        setIsRecording(true);
        setRecordingType(type);

        // Defer capture to next frame so HUD (greeting) is present in the canvas
        requestAnimationFrame(() => {
            // Stop was pressed before capture even began
            if (stoppedEarlyRef.current) {
                setIsRecording(false);
                setRecordingType(null);
                return;
            }
            const canvas = document.querySelector('canvas');
            if (!canvas) {
                setIsRecording(false);
                setRecordingType(null);
                if (onError) {
                    onError('Unable to find canvas to record.');
                } else {
                    alert('Unable to find canvas to record.');
                }
                return;
            }

            // Determine the best supported MIME type
            // Prioritize MP4 for better compatibility and quality
            const formats = [
                'video/webm;codecs=vp8',
                'video/mp4;codecs=h264',
                'video/mp4',
                'video/webm;codecs=vp8',
                'video/webm;codecs=vp9',
                'video/webm'
            ];

            const supportedMimeType = formats.find(f => MediaRecorder.isTypeSupported(f)) || 'video/webm';
            const extension = supportedMimeType.includes('mp4') ? 'mp4' : 'webm';

            console.log(`Starting recording with MIME type: ${supportedMimeType}`);

            // Use 30 FPS for smoother video and higher bitrate for better quality
            const stream = canvas.captureStream(30);
            let mediaRecorder: MediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(stream, {
                    mimeType: supportedMimeType,
                    videoBitsPerSecond: 8000000 // 8Mbps for high quality
                });
            } catch (err) {
                console.error('MediaRecorder init failed, falling back to default:', err);
                mediaRecorder = new MediaRecorder(stream);
            }

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };
            mediaRecorder.onstop = () => {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
                recorderRef.current = null;
                if (chunks.length === 0) {
                    // Stopped by the user right away: nothing to save, no error needed
                    if (stoppedEarlyRef.current) {
                        setIsRecording(false);
                        setRecordingType(null);
                        return;
                    }
                    if (onError) {
                        onError('Recording failed: no data was captured. Please try again.');
                    } else {
                        alert('Recording failed: no data was captured. Please try again.');
                    }
                    setIsRecording(false);
                    setRecordingType(null);
                    return;
                }
                const finalType = chunks[0].type || supportedMimeType;
                const finalExt = finalType.includes('mp4') ? 'mp4' : 'webm';
                const blob = new Blob(chunks, { type: finalType });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `christmas-tree-${type.toLowerCase()}.${finalExt}`;
                link.click();
                setIsRecording(false);
                setRecordingType(null);
            };

            mediaRecorder.onerror = (e) => {
                console.error('MediaRecorder error:', e);
                if (onError) {
                    onError('Recording failed to start. Please try again or use a modern browser.');
                } else {
                    alert('Recording failed to start. Please try again or use a modern browser.');
                }
                setIsRecording(false);
                setRecordingType(null);
            };

            // Duration logic
            const duration = type === 'FULL' ? 8000 : Math.max(photos.length * 1000, 2000); // 8s for full, 1s per photo (min 5s)

            mediaRecorder.start();
            recorderRef.current = mediaRecorder;
            timerRef.current = setTimeout(() => {
                if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            }, duration);
        });
    };

    // Stop the tour now. The part recorded so far is saved.
    const stopRecording = () => {
        stoppedEarlyRef.current = true;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const rec = recorderRef.current;
        if (rec && rec.state !== 'inactive') {
            rec.stop(); // onstop saves the clip and resets the state
        } else {
            setIsRecording(false);
            setRecordingType(null);
        }
    };

    return {
        isRecording,
        recordingType,
        handleRecordVideo,
        stopRecording
    };
};
