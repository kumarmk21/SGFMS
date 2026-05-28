import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, X, UserCheck, Package, Truck, User, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
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

const schema = z.object({
  mobile_number: z.string().min(7, 'Enter a valid mobile number').max(15),
  full_name: z.string().min(2, 'Full name is required'),
  visitor_type: z.enum(['courier', 'delivery_agent', 'visitor']),
  purpose_of_visit: z.string().optional(),
});

type CheckInForm = z.infer<typeof schema>;

const visitorTypes = [
  { value: 'visitor', label: 'Visitor', icon: User, color: 'border-red-200 bg-red-50 text-[#CC0000] hover:bg-red-100' },
  { value: 'delivery_agent', label: 'Delivery Agent', icon: Truck, color: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { value: 'courier', label: 'Courier', icon: Package, color: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100' },
];

export default function CheckInPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedOfficial, setSelectedOfficial] = useState<Profile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [success, setSuccess] = useState(false);

  const createCheckIn = useCreateCheckIn();
  const sendNotification = useSendNotification();
  const { data: returningVisitor } = useVisitorByMobile(mobileInput);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CheckInForm>({
    resolver: zodResolver(schema),
    defaultValues: { visitor_type: 'visitor' },
  });

  const visitorType = watch('visitor_type');
  const needsOfficial = visitorType === 'visitor' || visitorType === 'delivery_agent';

  useEffect(() => {
    if (returningVisitor) {
      setValue('full_name', returningVisitor.full_name);
      setValue('visitor_type', returningVisitor.visitor_type);
      if (returningVisitor.photo_url) setPhotoUrl(returningVisitor.photo_url);
    }
  }, [returningVisitor, setValue]);

  const onSubmit = async (data: CheckInForm) => {
    if (needsOfficial && !selectedOfficial) {
      toast.error('Please select a company official');
      return;
    }

    const checkIn = await createCheckIn.mutateAsync({
      visitor: {
        mobile_number: data.mobile_number,
        full_name: data.full_name,
        visitor_type: data.visitor_type as VisitorType,
        photo_url: photoUrl,
      },
      officialId: selectedOfficial?.id ?? null,
      purpose: data.purpose_of_visit ?? null,
      receptionistId: profile!.id,
    });

    if (selectedOfficial && checkIn) {
      const typeLabel = visitorTypes.find(t => t.value === data.visitor_type)?.label ?? data.visitor_type;
      const message = data.visitor_type === 'courier'
        ? `A courier has arrived for you. Courier: ${data.full_name} (${data.mobile_number}). Time: ${new Date().toLocaleTimeString()}`
        : data.visitor_type === 'delivery_agent'
          ? `A delivery agent is waiting at reception. Agent: ${data.full_name} (${data.mobile_number}). Time: ${new Date().toLocaleTimeString()}`
          : `${data.full_name} (${data.mobile_number}) is waiting at reception to meet you. Purpose: ${data.purpose_of_visit ?? 'Not specified'}. Time: ${new Date().toLocaleTimeString()}`;

      await sendNotification.mutateAsync({
        recipient_id: selectedOfficial.id,
        sender_id: profile!.id,
        check_in_id: checkIn.id,
        title: `${typeLabel} Arrived`,
        message,
        notification_type: 'in_app',
      });
    }

    if (data.visitor_type === 'courier') {
      navigate(`/receptionist/couriers/new?checkinId=${checkIn.id}`);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/receptionist');
      }, 2000);
    }
  };

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
        {/* Mobile Number */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visitor Details</CardTitle>
            <CardDescription>Enter the mobile number first to auto-fill returning visitor details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="+91 9876543210"
                {...register('mobile_number', {
                  onChange: (e) => setMobileInput(e.target.value)
                })}
                className={cn('text-lg h-12', errors.mobile_number && 'border-destructive')}
              />
              {errors.mobile_number && <p className="text-xs text-destructive">{errors.mobile_number.message}</p>}
              {returningVisitor && (
                <p className="text-xs text-green-600 font-medium">
                  ✓ Returning visitor — details pre-filled
                </p>
              )}
            </div>

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

            {/* Photo capture */}
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
          </CardContent>
        </Card>

        {/* Visitor Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Visitor Type *</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {visitorTypes.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('visitor_type', value as VisitorType)}
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

        {/* Official Selection */}
        {needsOfficial && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {visitorType === 'visitor' ? 'Who are they here to meet?' : 'Delivery addressed to?'}
                {' '}*
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

        {/* Purpose */}
        {visitorType === 'visitor' && (
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

        <Button
          type="submit"
          size="xl"
          className="w-full gap-2"
          disabled={createCheckIn.isPending}
        >
          {createCheckIn.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <UserCheck className="w-5 h-5" />
          )}
          {visitorType === 'courier' ? 'Check In & Log Courier' : 'Complete Check-In'}
        </Button>
      </form>

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture Visitor Photo</DialogTitle>
          </DialogHeader>
          <WebcamCapture
            onCapture={(dataUrl) => setPhotoUrl(dataUrl)}
            onClose={() => setShowCamera(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
