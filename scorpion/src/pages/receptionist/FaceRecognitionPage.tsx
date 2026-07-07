import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, CheckCircle2, Loader2, ScanFace, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import {
  useCreateFaceEntryLog,
  useFaceVisitors,
  useRegisterFaceVisitor,
} from '@/hooks/useFaceRecognition';
import {
  extractFaceFromVideo,
  findBestFaceMatch,
  loadFaceRecognitionModels,
} from '@/lib/faceRecognition';
import { cn, formatDateTime } from '@/lib/utils';

const schema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
});

type FaceRegistrationForm = z.infer<typeof schema>;

export default function FaceRecognitionPage() {
  const { profile } = useAuth();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanningRef = React.useRef(false);
  const lastLoggedRef = React.useRef<Record<string, number>>({});
  const [modelsReady, setModelsReady] = React.useState(false);
  const [cameraReady, setCameraReady] = React.useState(false);
  const [scannerActive, setScannerActive] = React.useState(false);
  const [status, setStatus] = React.useState('Load models and start the hidden scanner.');
  const [lastMatch, setLastMatch] = React.useState<{ name: string; entryAt: string; distance: number } | null>(null);

  const { data: visitors } = useFaceVisitors();
  const registerFaceVisitor = useRegisterFaceVisitor();
  const createFaceEntryLog = useCreateFaceEntryLog();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FaceRegistrationForm>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', phone: '', email: '' },
  });

  React.useEffect(() => {
    loadFaceRecognitionModels()
      .then(() => {
        setModelsReady(true);
        setStatus('Face models loaded. Start scanner to monitor visitors.');
      })
      .catch((error) => {
        setStatus('Unable to load face recognition models.');
        toast.error(error instanceof Error ? error.message : 'Failed to load face recognition models');
      });

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  React.useEffect(() => {
    if (!scannerActive || !cameraReady || !modelsReady) return;

    const interval = window.setInterval(() => {
      scanForReturningVisitor();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [scannerActive, cameraReady, modelsReady, visitors]);

  const startCamera = async () => {
    if (streamRef.current) {
      setScannerActive(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setScannerActive(true);
      setStatus('Hidden scanner active. Visitor faces are checked automatically.');
    } catch (error) {
      setStatus('Camera permission is required for automatic face recognition.');
      toast.error(error instanceof Error ? error.message : 'Camera permission denied');
    }
  };

  const stopCamera = () => {
    setScannerActive(false);
    setStatus('Hidden scanner paused.');
  };

  const scanForReturningVisitor = async () => {
    if (scanningRef.current || !videoRef.current || !visitors?.length) return;
    scanningRef.current = true;

    try {
      const face = await extractFaceFromVideo(videoRef.current);
      if (!face) {
        setStatus('Scanner active. Waiting for a registered face...');
        return;
      }

      const candidates = visitors
        .filter((visitor) => Array.isArray(visitor.face_descriptor) && visitor.face_descriptor.length > 0)
        .map((visitor) => ({ id: visitor.id, descriptor: visitor.face_descriptor }));
      const match = findBestFaceMatch(face.descriptor, candidates);
      if (!match) {
        setStatus('Face detected, but no registered visitor matched.');
        return;
      }

      const matchedVisitor = visitors.find((visitor) => visitor.id === match.id);
      if (!matchedVisitor) return;

      const now = Date.now();
      const lastLoggedAt = lastLoggedRef.current[matchedVisitor.id] ?? 0;
      if (now - lastLoggedAt < 120000) {
        setStatus(`${matchedVisitor.full_name} already logged recently.`);
        return;
      }

      lastLoggedRef.current[matchedVisitor.id] = now;
      await createFaceEntryLog.mutateAsync({
        face_visitor_id: matchedVisitor.id,
        match_distance: Number(match.distance.toFixed(4)),
        snapshot_data_url: face.snapshotDataUrl,
        created_by: profile?.id ?? null,
      });
      const entryAt = new Date().toISOString();
      setLastMatch({ name: matchedVisitor.full_name, entryAt, distance: match.distance });
      setStatus(`Auto-entry logged for ${matchedVisitor.full_name}.`);
      toast.success(`Auto-entry logged: ${matchedVisitor.full_name}`);
    } finally {
      scanningRef.current = false;
    }
  };

  const onRegister = async (data: FaceRegistrationForm) => {
    if (!videoRef.current || !cameraReady) {
      toast.error('Start the hidden scanner before registering a face.');
      return;
    }

    const face = await extractFaceFromVideo(videoRef.current);
    if (!face) {
      toast.error('No face detected. Ask the visitor to face the camera.');
      return;
    }

    await registerFaceVisitor.mutateAsync({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || null,
      face_descriptor: face.descriptor,
      photo_data_url: face.snapshotDataUrl,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    });
    reset();
  };

  const ready = modelsReady && cameraReady && scannerActive;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <video ref={videoRef} muted playsInline autoPlay className="fixed left-0 top-0 h-px w-px opacity-0 pointer-events-none" aria-hidden="true" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Face Recognition Entry</h1>
          <p className="text-sm text-muted-foreground">
            Hidden camera scanning registers first-time visitors and logs returning visitors automatically.
          </p>
        </div>
        <Badge variant={ready ? 'success' : 'secondary'} className="w-fit">
          {ready ? 'Hidden scanner active' : 'Scanner not active'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScanFace className="w-5 h-5 text-primary" />
              Auto-login Scanner
            </CardTitle>
            <CardDescription>No live camera preview is shown. The camera runs hidden and logs matches automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-gray-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className={cn('w-4 h-4', ready ? 'text-green-600' : 'text-muted-foreground')} />
                {status}
              </div>
              {lastMatch && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
                  <p className="font-semibold text-green-800">{lastMatch.name}</p>
                  <p className="text-green-700">Entry logged at {formatDateTime(lastMatch.entryAt)}</p>
                  <p className="text-xs text-green-600">Match distance {lastMatch.distance.toFixed(3)}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={startCamera} disabled={!modelsReady || scannerActive} className="gap-2 flex-1">
                {!modelsReady ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                Start Scanner
              </Button>
              <Button type="button" variant="outline" onClick={stopCamera} disabled={!scannerActive}>
                Pause
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Registered faces: {visitors?.length ?? 0}. Duplicate logs for the same visitor are suppressed for two minutes.
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              First-Time Visitor Registration
            </CardTitle>
            <CardDescription>Fill visitor details, then capture face encoding from the hidden camera.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onRegister)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Name *</Label>
                  <Input id="full_name" placeholder="Visitor name" {...register('full_name')} />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" placeholder="Phone number" {...register('phone')} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@example.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>

              <Button type="submit" disabled={!cameraReady || registerFaceVisitor.isPending} className="gap-2">
                {registerFaceVisitor.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Register Face From Hidden Camera
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
