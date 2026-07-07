import React, { useRef, useState, useCallback, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Eye, EyeOff, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Loader as Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FaceDetectionEvent {
  photoUrl: string;
  faceCount: number;
  confidence: number;
  capturedAt: Date;
}

interface FaceRecognitionCameraProps {
  onFaceDetected: (event: FaceDetectionEvent) => void;
  active: boolean;
  captureIntervalMs?: number;
  minConfidence?: number;
  cameraLabel?: string;
}

type LoadState = 'idle' | 'loading-models' | 'starting-camera' | 'ready' | 'error';

const MODEL_URL = '/models';
const DETECTION_INTERVAL_MS = 800;

export default function FaceRecognitionCamera({
  onFaceDetected,
  active,
  captureIntervalMs = 5000,
  minConfidence = 0.5,
  cameraLabel,
}: FaceRecognitionCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCaptureRef = useRef<number>(0);
  const modelsLoadedRef = useRef(false);

  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [facesVisible, setFacesVisible] = useState(0);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const stopCamera = useCallback(() => {
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
    setFacesVisible(0);
  }, []);

  const captureFrame = useCallback((detections: faceapi.FaceDetection[]): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  const drawOverlay = useCallback((
    detections: faceapi.FaceDetection[],
    width: number,
    height: number,
  ) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    if (!showOverlay) return;

    detections.forEach(det => {
      const { x, y, width: w, height: h } = det.box;
      const score = det.score;
      const color = score > 0.8 ? '#22c55e' : score > 0.6 ? '#f59e0b' : '#ef4444';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Corner accents
      const cs = 12;
      ctx.lineWidth = 3;
      [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(
        ([cx, cy, dx, dy]) => {
          ctx.beginPath();
          ctx.moveTo(cx as number, (cy as number) + (dy as number) * cs);
          ctx.lineTo(cx as number, cy as number);
          ctx.lineTo((cx as number) + (dx as number) * cs, cy as number);
          ctx.stroke();
        },
      );

      // Confidence label
      const label = `${Math.round(score * 100)}%`;
      ctx.font = 'bold 11px monospace';
      const tw = ctx.measureText(label).width + 8;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 18, tw, 17);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 4, y - 5);
    });
  }, [showOverlay]);

  const runDetectionLoop = useCallback(() => {
    detectionLoopRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: minConfidence }));

      setFacesVisible(detections.length);
      drawOverlay(detections, video.videoWidth, video.videoHeight);

      if (detections.length === 0) return;

      const now = Date.now();
      if (now - lastCaptureRef.current < captureIntervalMs) return;

      const best = detections.reduce((a, b) => (a.score > b.score ? a : b));
      if (best.score < minConfidence) return;

      const photoUrl = captureFrame(detections);
      if (!photoUrl) return;

      lastCaptureRef.current = now;
      setCaptureFlash(true);
      setTimeout(() => setCaptureFlash(false), 300);

      onFaceDetected({
        photoUrl,
        faceCount: detections.length,
        confidence: best.score,
        capturedAt: new Date(),
      });
    }, DETECTION_INTERVAL_MS);
  }, [captureIntervalMs, minConfidence, captureFrame, drawOverlay, onFaceDetected]);

  const start = useCallback(async () => {
    setError(null);

    if (!modelsLoadedRef.current) {
      setLoadState('loading-models');
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        modelsLoadedRef.current = true;
      } catch {
        setError('Failed to load face detection models. Make sure /public/models/ exists.');
        setLoadState('error');
        return;
      }
    }

    setLoadState('starting-camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLoadState('ready');
      runDetectionLoop();
    } catch {
      setError('Camera access denied. Please allow camera permissions and try again.');
      setLoadState('error');
    }
  }, [runDetectionLoop]);

  useEffect(() => {
    if (active) {
      start();
    } else {
      stopCamera();
      setLoadState('idle');
    }
    return () => stopCamera();
  }, [active, start, stopCamera]);

  // Re-draw overlay when showOverlay changes
  useEffect(() => {
    if (!showOverlay && overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
  }, [showOverlay]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video select-none">
      {/* Video feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
      />

      {/* Detection overlay canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: 'cover' }}
      />

      {/* Hidden capture canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Capture flash */}
      <div
        className={cn(
          'absolute inset-0 bg-white transition-opacity duration-100 pointer-events-none',
          captureFlash ? 'opacity-60' : 'opacity-0',
        )}
      />

      {/* Status overlay — shown when not ready */}
      {loadState !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-3">
          {loadState === 'idle' && (
            <>
              <Camera className="w-10 h-10 text-white/50" />
              <p className="text-sm text-white/60">Camera inactive</p>
            </>
          )}
          {(loadState === 'loading-models' || loadState === 'starting-camera') && (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-white/80" />
              <p className="text-sm text-white/80">
                {loadState === 'loading-models' ? 'Loading face detection models…' : 'Starting camera…'}
              </p>
            </>
          )}
          {loadState === 'error' && (
            <>
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-red-300 text-center max-w-[280px]">{error}</p>
              <button
                onClick={start}
                className="mt-2 px-4 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {/* HUD — shown when ready */}
      {loadState === 'ready' && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white/90 font-medium tracking-wide uppercase">Live</span>
              {cameraLabel && (
                <span className="text-xs text-white/50 ml-1">{cameraLabel}</span>
              )}
            </div>
            <button
              onClick={() => setShowOverlay(v => !v)}
              className="text-white/60 hover:text-white transition"
              title={showOverlay ? 'Hide detection overlay' : 'Show detection overlay'}
            >
              {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Face count badge */}
          <div className="absolute bottom-3 left-3">
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors',
              facesVisible > 0
                ? 'bg-green-500/90 text-white'
                : 'bg-black/50 text-white/60',
            )}>
              {facesVisible > 0 ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
              {facesVisible > 0 ? `${facesVisible} face${facesVisible > 1 ? 's' : ''} detected` : 'No faces'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
