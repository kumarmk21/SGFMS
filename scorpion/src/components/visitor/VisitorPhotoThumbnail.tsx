import React from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VisitorPhotoThumbnailProps {
  src?: string | null;
  alt: string;
  fallback: React.ReactNode;
  className?: string;
  fallbackClassName?: string;
  shape?: 'circle' | 'rounded';
}

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 3;

export default function VisitorPhotoThumbnail({
  src,
  alt,
  fallback,
  className,
  fallbackClassName,
  shape = 'circle',
}: VisitorPhotoThumbnailProps) {
  const [zoom, setZoom] = React.useState(1);
  const [previewPosition, setPreviewPosition] = React.useState<{ x: number; y: number } | null>(null);

  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const thumbnail = (
    <Avatar className={cn('h-full w-full', roundedClass)}>
      <AvatarImage src={src ?? undefined} alt={alt} className="object-cover" />
      <AvatarFallback className={cn('text-xs', fallbackClassName)}>{fallback}</AvatarFallback>
    </Avatar>
  );

  if (!src) {
    return <div className={cn('h-10 w-10 shrink-0', roundedClass, className)}>{thumbnail}</div>;
  }

  const setPreviewFromPoint = (clientX: number, clientY: number) => {
    const previewWidth = 224;
    const previewHeight = 292;
    const nextX = clientX + 16;
    const nextY = clientY + 16 + previewHeight > window.innerHeight
      ? clientY - previewHeight - 16
      : clientY + 16;

    setPreviewPosition({
      x: Math.max(8, Math.min(nextX, window.innerWidth - previewWidth - 8)),
      y: Math.max(8, Math.min(nextY, window.innerHeight - previewHeight - 8)),
    });
  };

  return (
    <Dialog onOpenChange={(open) => {
      if (open) setZoom(1);
      setPreviewPosition(null);
    }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'group relative shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            roundedClass,
            className
          )}
          aria-label={`Open ${alt}`}
          onBlur={() => setPreviewPosition(null)}
          onClick={() => setPreviewPosition(null)}
          onFocus={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setPreviewFromPoint(rect.right, rect.top);
          }}
          onMouseEnter={(event) => setPreviewFromPoint(event.clientX, event.clientY)}
          onMouseLeave={() => setPreviewPosition(null)}
          onMouseMove={(event) => setPreviewFromPoint(event.clientX, event.clientY)}
        >
          {thumbnail}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100 group-focus-visible:bg-black/35 group-focus-visible:opacity-100">
            <ZoomIn className="h-4 w-4" />
          </span>
        </button>
      </DialogTrigger>

      {previewPosition && (
        <div
          className="pointer-events-none fixed z-[60] w-56 rounded-2xl border bg-white p-2 shadow-2xl"
          style={{ left: previewPosition.x, top: previewPosition.y }}
        >
          <img src={src} alt={alt} className="h-56 w-full rounded-xl object-cover" />
          <p className="mt-2 truncate px-1 text-xs font-medium text-foreground">{alt}</p>
        </div>
      )}

      <DialogContent className="max-w-3xl overflow-hidden border-0 p-0 sm:rounded-2xl">
        <div className="border-b px-5 py-4 pr-12">
          <div>
            <DialogTitle className="text-base">Visitor photo</DialogTitle>
            <DialogDescription>{alt}</DialogDescription>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-auto bg-black/90 p-6">
          <div className="flex min-h-[45vh] items-center justify-center">
            <img
              src={src}
              alt={alt}
              className="max-h-[65vh] max-w-full rounded-xl object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 border-t px-5 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="gap-2"
          >
            <ZoomOut className="h-4 w-4" />
            <span className="hidden sm:inline">Zoom out</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom(1)}
            disabled={zoom === 1}
            aria-label="Reset zoom"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="gap-2"
          >
            <ZoomIn className="h-4 w-4" />
            <span className="hidden sm:inline">Zoom in</span>
          </Button>
          <span className="w-12 text-right text-xs font-medium text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
