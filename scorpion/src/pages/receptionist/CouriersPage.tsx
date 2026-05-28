import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Plus, ArrowLeft, Loader2, MapPin, Hash, Weight, FileText, Layers, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import OfficialSearchDropdown from '@/components/visitor/OfficialSearchDropdown';
import { useAuth } from '@/context/AuthContext';
import { useTodayCourierReceipts, useCreateCourierReceipt } from '@/hooks/useCourier';
import { useSendNotification } from '@/hooks/useNotifications';
import { useCheckIns } from '@/hooks/useVisitors';
import type { Profile } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

const schema = z.object({
  sender_name: z.string().min(2, 'Sender name is required'),
  sender_address: z.string().min(5, 'Sender address is required'),
  tracking_number: z.string().optional(),
  package_weight: z.string().optional(),
  package_description: z.string().min(3, 'Package description is required'),
  number_of_packages: z.string().min(1).refine(v => !isNaN(Number(v)) && Number(v) >= 1, 'At least 1 package required'),
});

type CourierForm = z.infer<typeof schema>;

export default function CouriersPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkInIdFromUrl = searchParams.get('checkinId');
  const [showForm, setShowForm] = useState(!!checkInIdFromUrl);
  const [selectedCheckInId, setSelectedCheckInId] = useState<string | null>(checkInIdFromUrl);
  const [selectedRecipient, setSelectedRecipient] = useState<Profile | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: receipts, isLoading } = useTodayCourierReceipts();
  const createReceipt = useCreateCourierReceipt();
  const sendNotification = useSendNotification();

  const { data: courierCheckIns } = useCheckIns({});

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CourierForm>({
    resolver: zodResolver(schema),
    defaultValues: { number_of_packages: '1' },
  });

  const onSubmit = async (data: CourierForm) => {
    if (!selectedRecipient) {
      toast.error('Please select a recipient');
      return;
    }

    const receipt = await createReceipt.mutateAsync({
      check_in_id: selectedCheckInId ?? '',
      sender_name: data.sender_name,
      sender_address: data.sender_address,
      recipient_id: selectedRecipient.id,
      tracking_number: data.tracking_number ?? null,
      package_weight: data.package_weight ?? null,
      package_description: data.package_description,
      number_of_packages: Number(data.number_of_packages),
    });

    await sendNotification.mutateAsync({
      recipient_id: selectedRecipient.id,
      sender_id: profile!.id,
      courier_receipt_id: receipt.id,
      title: 'Courier Package Received',
      message: `A courier package has arrived for you from ${data.sender_name}. ${data.number_of_packages} package(s) — ${data.package_description}. ${data.tracking_number ? `Tracking: ${data.tracking_number}.` : ''} Collected at reception.`,
      notification_type: 'in_app',
    });

    setSuccess(true);
    reset();
    setTimeout(() => {
      setSuccess(false);
      setShowForm(false);
      navigate('/receptionist/couriers');
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Receipt Logged!</h2>
          <p className="text-muted-foreground mt-1">
            {selectedRecipient ? `Notification sent to ${selectedRecipient.full_name}` : 'Receipt recorded successfully'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Courier Receipts</h1>
            <p className="text-sm text-muted-foreground">Today's courier log</p>
          </div>
        </div>
        <Button onClick={() => { setSelectedCheckInId(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          New Receipt
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Log Courier Receipt
            </CardTitle>
            <CardDescription>Enter package details to create a receipt</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sender Name *</Label>
                  <Input placeholder="Company or person name" {...register('sender_name')} className={errors.sender_name ? 'border-destructive' : ''} />
                  {errors.sender_name && <p className="text-xs text-destructive">{errors.sender_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Tracking Number</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="e.g., DHL1234567" className="pl-9" {...register('tracking_number')} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Sender Address *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea placeholder="Full sender address" className="pl-9 min-h-[70px]" {...register('sender_address')} />
                </div>
                {errors.sender_address && <p className="text-xs text-destructive">{errors.sender_address.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Recipient (Company Official) *</Label>
                <OfficialSearchDropdown
                  value={selectedRecipient?.id ?? ''}
                  onChange={setSelectedRecipient}
                  placeholder="Search who this package is for..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Package Weight</Label>
                  <div className="relative">
                    <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="e.g., 2.5 kg" className="pl-9" {...register('package_weight')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>No. of Packages *</Label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" min="1" className="pl-9" {...register('number_of_packages')} />
                  </div>
                  {errors.number_of_packages && <p className="text-xs text-destructive">{errors.number_of_packages.message}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-1 col-span-1">
                  <Label>Description *</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="e.g., Documents, Electronics" className="pl-9" {...register('package_description')} />
                  </div>
                  {errors.package_description && <p className="text-xs text-destructive">{errors.package_description.message}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={createReceipt.isPending}>
                  {createReceipt.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Log Receipt
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Today's Receipts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's Courier Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !receipts?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No courier receipts today</p>
            </div>
          ) : (
            <div className="divide-y">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{receipt.sender_name}</p>
                        {receipt.tracking_number && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {receipt.tracking_number}
                          </Badge>
                        )}
                        <Badge variant="purple" className="text-xs">
                          {receipt.number_of_packages} pkg{receipt.number_of_packages > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{receipt.package_description}</p>
                      <p className="text-xs text-muted-foreground">{receipt.sender_address}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-primary">
                        → {(receipt.recipient as any)?.full_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">{(receipt.recipient as any)?.department}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDateTime(receipt.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
