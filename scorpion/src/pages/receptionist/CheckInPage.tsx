import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Camera, X, UserCheck, Truck, User, Loader2, ArrowLeft,
  CheckCircle, ShieldCheck, RefreshCw, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OfficialSearchDropdown from '@/components/visitor/OfficialSearchDropdown';
import WebcamCapture from '@/components/visitor/WebcamCapture';
import { useAuth } from '@/context/AuthContext';
import { useVisitorByMobile, useCreateCheckIn } from '@/hooks/useVisitors';
import { useSendNotification } from '@/hooks/useNotifications';
import type { Profile, VisitorType } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  mobile_number:    z.string().min(7, 'Enter a valid mobile number').max(15),
  full_name:        z.string().min(2, 'Full name is required'),
  visitor_type:     z.enum(['delivery_agent', 'visitor']),
  purpose_of_visit: z.string().optional(),
});

type CheckInForm = z.infer<typeof schema>;

const visitorTypes = [
  { value: 'visitor',        label: 'Visitor',        icon: User,  color: 'border-red-200 bg-red-50 text-[#CC0000] hover:bg-red-100' },
  { value: 'delivery_agent', label: 'Delivery Agent', icon: Truck, color: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' },
];

// OTP step states
type OtpState = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

// ─── OTP helpers ──────────────────────────────────────────────────────────────

async function callOtpFn(action: 'send' | 'verify', mobile: string, otp?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/otp`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action, mobile, otp }),
    }
  );
  return res.json();
}

// ─── OTP Input — 6 individual digit boxes ─────────────────────────────────────

function OtpInput({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  // Single ref holding an array — avoids calling useRef inside a loop
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));

  // Build a fixed-length digits array regardless of value length
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');

  const focus = (i: number) => inputRefs.current[i]?.focus();

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      // Clear current box, then move back
      const next = digits.map((d, idx) => (idx === i ? '' : d)).join('');
      onChange(next.trimEnd()); // trim trailing empties to keep length accurate
      if (digits[i] === '' && i > 0) setTimeout(() => focus(i - 1), 0);
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    if (!v) return;
    const next = digits.map((d, idx) => (idx === i ? v : d)).join('');
    onChange(next);
    if (i < OTP_LENGTH - 1) setTimeout(() => focus(i + 1), 0);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted) {
      onChange(pasted);
      setTimeout(() => focus(Math.min(pasted.length, OTP_LENGTH - 1)), 0);
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onFocus={e => e.target.select()}
          className={cn(
            'w-11 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all',
            'focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/20',
            digit ? 'border-[#CC0000] bg-red-50 text-[#CC0000]' : 'border-gray-200 bg-gray-50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [selectedOfficial, setSelectedOfficial] = useState<Profile | null>(null);
  const [photoUrl, setPhotoUrl]   = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [success, setSuccess]     = useState(false);

  // OTP state
  const [otpState, setOtpState]   = useState<OtpState>('idle');
  const [otpValue, setOtpValue]   = useState('');
  const [otpError, setOtpError]   = useState('');
  const [cooldown, setCooldown]   = useState(0);

  const createCheckIn     = useCreateCheckIn();
  const sendNotification  = useSendNotification();
  const { data: returningVisitor } = useVisitorByMobile(mobileInput);

  const { register, handleSubmit, setValue, watch, getValues, formState: { errors } } = useForm<CheckInForm>({
    resolver: zodResolver(schema),
    defaultValues: { visitor_type: 'visitor' },
  });

  const visitorType = watch('visitor_type');

  useEffect(() => {
    if (returningVisitor) {
      setValue('full_name', returningVisitor.full_name);
      const vt = returningVisitor.visitor_type === 'courier' ? 'visitor' : returningVisitor.visitor_type;
      setValue('visitor_type', vt as 'visitor' | 'delivery_agent');
      if (returningVisitor.photo_url) setPhotoUrl(returningVisitor.photo_url);
    }
  }, [returningVisitor, setValue]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Reset OTP when mobile changes
  useEffect(() => {
    setOtpState('idle');
    setOtpValue('');
    setOtpError('');
  }, [mobileInput]);

  // ── Send OTP ──────────────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    const mobile = getValues('mobile_number');
    if (!mobile || mobile.length < 7) {
      toast.error('Enter a valid mobile number first');
      return;
    }
    setOtpState('sending');
    setOtpValue('');
    setOtpError('');
    try {
      const res = await callOtpFn('send', mobile);
      if (res.error) throw new Error(res.error);
      setOtpState('sent');
      setCooldown(RESEND_COOLDOWN);
      toast.success(`OTP sent to ${mobile}`);
    } catch (e: unknown) {
      setOtpState('idle');
      toast.error(e instanceof Error ? e.message : 'Failed to send OTP');
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    if (otpValue.length < OTP_LENGTH) {
      setOtpError(`Enter all ${OTP_LENGTH} digits`);
      return;
    }
    const mobile = getValues('mobile_number');
    setOtpState('verifying');
    setOtpError('');
    try {
      const res = await callOtpFn('verify', mobile, otpValue);
      if (!res.success) throw new Error(res.error);
      setOtpState('verified');
      toast.success('OTP verified ✓');
    } catch (e: unknown) {
      setOtpState('sent'); // allow retry
      setOtpError(e instanceof Error ? e.message : 'Invalid OTP');
    }
  };

  // ── Final form submit ─────────────────────────────────────────────────────

  const onSubmit = async (data: CheckInForm) => {
    if (otpState !== 'verified') {
      toast.error('Please verify the OTP before completing check-in');
      return;
    }
    if (!selectedOfficial) {
      toast.error('Please select a company official');
      return;
    }

    const checkIn = await createCheckIn.mutateAsync({
      visitor: {
        mobile_number: data.mobile_number,
        full_name:     data.full_name,
        visitor_type:  data.visitor_type as VisitorType,
        photo_url:     photoUrl,
      },
      officialId:      selectedOfficial?.id ?? null,
      purpose:         data.purpose_of_visit ?? null,
      receptionistId:  profile!.id,
    });

    if (selectedOfficial && checkIn) {
      const typeLabel = visitorTypes.find(t => t.value === data.visitor_type)?.label ?? data.visitor_type;
      const message = data.visitor_type === 'delivery_agent'
        ? `A delivery agent is waiting at reception. Agent: ${data.full_name} (${data.mobile_number}). Time: ${new Date().toLocaleTimeString()}`
        : `${data.full_name} (${data.mobile_number}) is waiting at reception to meet you. Purpose: ${data.purpose_of_visit ?? 'Not specified'}. Time: ${new Date().toLocaleTimeString()}`;

      await sendNotification.mutateAsync({
        recipient_id:      selectedOfficial.id,
        sender_id:         profile!.id,
        check_in_id:       checkIn.id,
        title:             `${typeLabel} Arrived`,
        message,
        notification_type: 'in_app',
        visitor_name:      data.full_name,
        visitor_mobile:    data.mobile_number,
        visitor_type:      data.visitor_type,
        purpose:           data.purpose_of_visit ?? null,
        check_in_time:     new Date().toISOString(),
      });
    }

    setSuccess(true);
    setTimeout(() => { setSuccess(false); navigate('/receptionist'); }, 2500);
  };

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Check-In Recorded!</h2>
          <p className="text-muted-foreground mt-1">
            {selectedOfficial ? `Notification sent to ${selectedOfficial.full_name}` : 'Visitor registered successfully'}
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">New Check-In</h1>
          <p className="text-sm text-muted-foreground">Register a visitor at the front desk</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Visitor Details ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visitor Details</CardTitle>
            <CardDescription>Enter the mobile number to auto-fill returning visitor details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Mobile + Send OTP */}
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+91 9876543210"
                  {...register('mobile_number', { onChange: e => setMobileInput(e.target.value) })}
                  className={cn('text-lg h-12 flex-1', errors.mobile_number && 'border-destructive')}
                  disabled={otpState === 'verified'}
                />
                {otpState !== 'verified' && (
                  <Button
                    type="button"
                    size="lg"
                    variant={otpState === 'sent' ? 'outline' : 'default'}
                    className="h-12 gap-2 shrink-0 whitespace-nowrap"
                    onClick={handleSendOtp}
                    disabled={otpState === 'sending' || cooldown > 0}
                  >
                    {otpState === 'sending' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    {otpState === 'sent' && cooldown > 0
                      ? `Resend (${cooldown}s)`
                      : otpState === 'sent' ? 'Resend OTP' : 'Send OTP'}
                  </Button>
                )}
                {otpState === 'verified' && (
                  <div className="h-12 flex items-center gap-1.5 px-3 bg-green-100 text-green-700 rounded-lg text-sm font-semibold shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                    Verified
                  </div>
                )}
              </div>
              {errors.mobile_number && <p className="text-xs text-destructive">{errors.mobile_number.message}</p>}
              {returningVisitor && otpState !== 'verified' && (
                <p className="text-xs text-green-600 font-medium">✓ Returning visitor — details will be pre-filled after OTP verification</p>
              )}
            </div>

            {/* OTP Input Box */}
            {(otpState === 'sent' || otpState === 'verifying') && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <ShieldCheck className="w-4 h-4" />
                  Enter the {OTP_LENGTH}-digit OTP sent to the visitor's mobile
                </div>
                <OtpInput
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={otpState === 'verifying'}
                />
                {otpError && (
                  <p className="text-xs text-red-600 font-medium text-center">{otpError}</p>
                )}
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={handleVerifyOtp}
                  disabled={otpState === 'verifying' || otpValue.length < OTP_LENGTH}
                >
                  {otpState === 'verifying'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                    : <><ShieldCheck className="w-4 h-4" /> Verify OTP</>}
                </Button>
              </div>
            )}

            {/* Rest of the details — only show after OTP verified */}
            {otpState === 'verified' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="Enter visitor's full name"
                    {...register('full_name')}
                    className={cn('h-11', errors.full_name && 'border-destructive')}
                  />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Photo (Optional)</Label>
                  {photoUrl ? (
                    <div className="relative inline-block">
                      <img src={photoUrl} alt="Visitor" className="w-24 h-24 rounded-xl object-cover border-2 border-primary/20" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setShowCamera(true)} className="gap-2">
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Visitor Type — only after OTP ── */}
        {otpState === 'verified' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visitor Type *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {visitorTypes.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('visitor_type', value as 'visitor' | 'delivery_agent')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      visitorType === value ? color : 'border-border bg-background hover:bg-muted'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Official Selection — only after OTP ── */}
        {otpState === 'verified' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {visitorType === 'visitor' ? 'Who are they here to meet?' : 'Delivery addressed to?'} *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OfficialSearchDropdown
                value={selectedOfficial?.id ?? ''}
                onChange={setSelectedOfficial}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Purpose — only for visitor after OTP ── */}
        {otpState === 'verified' && visitorType === 'visitor' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Purpose of Visit</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., Business meeting, Interview, Personal visit..."
                {...register('purpose_of_visit')}
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>
        )}

        {/* ── Submit ── */}
        {otpState === 'verified' && (
          <Button
            type="submit"
            size="xl"
            className="w-full gap-2"
            disabled={createCheckIn.isPending}
          >
            {createCheckIn.isPending
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <UserCheck className="w-5 h-5" />}
            Complete Check-In
          </Button>
        )}

        {/* Prompt before OTP */}
        {otpState === 'idle' && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Enter the visitor's mobile number and click <strong>Send OTP</strong> to begin
          </div>
        )}
      </form>

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture Visitor Photo</DialogTitle>
          </DialogHeader>
          <WebcamCapture
            onCapture={dataUrl => setPhotoUrl(dataUrl)}
            onClose={() => setShowCamera(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
