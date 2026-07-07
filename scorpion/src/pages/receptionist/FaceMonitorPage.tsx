import React, { useState, useCallback, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Power, PowerOff, Trash2, Download, ScanFace, Clock, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import FaceRecognitionCamera, { type FaceDetectionEvent } from '@/components/visitor/FaceRecognitionCamera';
import { cn } from '@/lib/utils';

interface LogEntry extends FaceDetectionEvent {
  id: string;
  saved: boolean;
}

export default function FaceMonitorPage() {
  const { profile } = useAuth();
  const [active, setActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalDetected, setTotalDetected] = useState(0);
  const [saving, setSaving] = useState(false);
  const saveQueueRef = useRef<FaceDetectionEvent[]>([]);

  const saveToDb = useCallback(async (event: FaceDetectionEvent) => {
    if (!profile) return;
    setSaving(true);
    try {
      await supabase.from('face_logs').insert({
        captured_at: event.capturedAt.toISOString(),
        photo_url: event.photoUrl,
        face_count: event.faceCount,
        confidence: event.confidence,
        camera_label: 'Entrance Camera',
        logged_by: profile.id,
      });
    } catch (err) {
      console.error('Failed to save face log:', err);
    } finally {
      setSaving(false);
    }
  }, [profile]);

  const handleFaceDetected = useCallback((event: FaceDetectionEvent) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setLogs(prev => [{ ...event, id, saved: false }, ...prev].slice(0, 50));
    setTotalDetected(n => n + 1);

    saveToDb(event).then(() => {
      setLogs(prev => prev.map(l => l.id === id ? { ...l, saved: true } : l));
    });
  }, [saveToDb]);

  const clearLogs = useCallback(() => setLogs([]), []);

  const exportLogs = useCallback(() => {
    const rows = [
      ['Captured At', 'Faces', 'Confidence', 'Saved'],
      ...logs.map(l => [
        format(l.capturedAt, 'yyyy-MM-dd HH:mm:ss'),
        l.faceCount,
        `${(l.confidence * 100).toFixed(1)}%`,
        l.saved ? 'Yes' : 'No',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `face-log-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    a.click();
  }, [logs]);

  const avgConfidence = logs.length
    ? (logs.reduce((s, l) => s + l.confidence, 0) / logs.length * 100).toFixed(0)
    : '—';

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanFace className="w-6 h-6 text-primary" />
            Face Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automatic face detection — camera captures every unique visitor passing the entrance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Saving…
            </Badge>
          )}
          <Button
            onClick={() => setActive(v => !v)}
            variant={active ? 'destructive' : 'default'}
            className="gap-2"
          >
            {active ? (
              <><PowerOff className="w-4 h-4" /> Stop Monitor</>
            ) : (
              <><Power className="w-4 h-4" /> Start Monitor</>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera feed — takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <FaceRecognitionCamera
            onFaceDetected={handleFaceDetected}
            active={active}
            captureIntervalMs={4000}
            minConfidence={0.45}
            cameraLabel="Entrance Camera"
          />

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 bg-muted/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ScanFace className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Session Captures</p>
                  <p className="text-xl font-bold">{totalDetected}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-muted/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Confidence</p>
                  <p className="text-xl font-bold">{avgConfidence}{avgConfidence !== '—' ? '%' : ''}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-muted/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saved to DB</p>
                  <p className="text-xl font-bold">{logs.filter(l => l.saved).length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Log panel */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Capture Log
              {logs.length > 0 && (
                <Badge variant="secondary" className="ml-1">{logs.length}</Badge>
              )}
            </h2>
            <div className="flex gap-1">
              {logs.length > 0 && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportLogs} title="Export CSV">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={clearLogs} title="Clear log">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ScanFace className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {active ? 'Waiting for faces to appear…' : 'Start the monitor to begin capturing'}
                </p>
              </div>
            ) : (
              logs.map((entry) => (
                <LogCard key={entry.id} entry={entry} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogCard({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const confidencePct = Math.round(entry.confidence * 100);
  const confidenceColor =
    confidencePct >= 80 ? 'text-green-600' :
    confidencePct >= 60 ? 'text-amber-600' : 'text-red-500';

  return (
    <div
      className={cn(
        'rounded-xl border bg-card overflow-hidden cursor-pointer transition-shadow hover:shadow-md',
        !entry.saved && 'opacity-70',
      )}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
          <img
            src={entry.photoUrl}
            alt="Captured frame"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <span className="text-xs font-semibold">
              {entry.faceCount} face{entry.faceCount > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1">
              {entry.saved ? (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-300 text-green-600 bg-green-50">
                  saved
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300 bg-amber-50">
                  saving…
                </Badge>
              )}
            </div>
          </div>
          <p className={cn('text-sm font-bold', confidenceColor)}>
            {confidencePct}% confidence
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {formatDistanceToNow(entry.capturedAt, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Expanded photo */}
      {expanded && (
        <div className="px-3 pb-3">
          <img
            src={entry.photoUrl}
            alt="Full captured frame"
            className="w-full rounded-lg object-cover"
            onClick={e => e.stopPropagation()}
          />
          <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
            {format(entry.capturedAt, 'PPpp')}
          </p>
        </div>
      )}
    </div>
  );
}
