import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WebcamCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      setError('Camera access denied or not available. Please allow camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCaptured(dataUrl);
      stopCamera();
    }
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCaptured(null);
    startCamera();
  }, [startCamera]);

  const confirm = useCallback(() => {
    if (captured) {
      onCapture(captured);
      onClose();
    }
  }, [captured, onCapture, onClose]);

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="text-center py-8">
          <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={startCamera} className="mt-3">
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {!captured ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <img src={captured} alt="Captured" className="w-full h-full object-cover" />
            )}
            {!streaming && !captured && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-3">
            {!captured ? (
              <>
                <Button variant="outline" onClick={onClose} className="flex-1 gap-2">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button onClick={capturePhoto} disabled={!streaming} className="flex-1 gap-2">
                  <Camera className="w-4 h-4" /> Capture
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={retake} className="flex-1 gap-2">
                  <RotateCcw className="w-4 h-4" /> Retake
                </Button>
                <Button onClick={confirm} className="flex-1 gap-2">
                  <Check className="w-4 h-4" /> Use Photo
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
