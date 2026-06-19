import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar,
  Edit,
  FileText,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import {
  useCreateInternalCourierTracking,
  useInternalCourierTracking,
  useUpdateInternalCourierTracking,
} from '@/hooks/useInternalCourierTracking';
import type { InternalCourierTrackingRecord } from '@/types';
import { cn, formatDate } from '@/lib/utils';

const schema = z.object({
  courier_date: z.string().min(1, 'Date is required'),
  consignee: z.string().min(2, 'Consignee is required'),
  consignor: z.string().min(2, 'Consignor is required'),
  courier_name: z.string().min(2, 'Courier name is required'),
  document_tracking_number: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  status: z.string().optional(),
  remarks: z.string().optional(),
});

type InternalCourierForm = z.infer<typeof schema>;

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const defaultValues = (): InternalCourierForm => ({
  courier_date: today(),
  consignee: '',
  consignor: '',
  courier_name: '',
  document_tracking_number: '',
  location: '',
  status: '',
  remarks: '',
});

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function InternalCourierTrackingPage() {
  const { profile } = useAuth();
  const [search, setSearch] = React.useState('');
  const [editing, setEditing] = React.useState<InternalCourierTrackingRecord | null>(null);

  const { data: records, isLoading, refetch } = useInternalCourierTracking();
  const createRecord = useCreateInternalCourierTracking();
  const updateRecord = useUpdateInternalCourierTracking();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InternalCourierForm>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  });

  const filtered = React.useMemo(() => {
    const rows = records ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((record) =>
      record.consignee.toLowerCase().includes(q) ||
      record.consignor.toLowerCase().includes(q) ||
      record.courier_name.toLowerCase().includes(q) ||
      (record.document_tracking_number ?? '').toLowerCase().includes(q) ||
      record.location.toLowerCase().includes(q) ||
      (record.status ?? '').toLowerCase().includes(q)
    );
  }, [records, search]);

  const stats = React.useMemo(() => ({
    total: records?.length ?? 0,
    visible: filtered.length,
    today: (records ?? []).filter((record) => record.courier_date === today()).length,
  }), [records, filtered.length]);

  const handleCancelEdit = () => {
    setEditing(null);
    reset(defaultValues());
  };

  const handleEdit = (record: InternalCourierTrackingRecord) => {
    setEditing(record);
    reset({
      courier_date: record.courier_date,
      consignee: record.consignee,
      consignor: record.consignor,
      courier_name: record.courier_name,
      document_tracking_number: record.document_tracking_number ?? '',
      location: record.location,
      status: record.status ?? '',
      remarks: record.remarks ?? '',
    });
  };

  const onSubmit = async (data: InternalCourierForm) => {
    if (editing) {
      await updateRecord.mutateAsync({
        ...data,
        id: editing.id,
        updated_by: profile?.id ?? null,
      });
      handleCancelEdit();
      return;
    }

    await createRecord.mutateAsync({
      ...data,
      created_by: profile?.id ?? null,
    });
    reset(defaultValues());
  };

  const submitting = createRecord.isPending || updateRecord.isPending;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Outward Courier Entry</h1>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="gap-2">
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Records" value={stats.total} />
        <StatCard label="Shown in List" value={stats.visible} />
        <StatCard label="Added Today" value={stats.today} />
      </div>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {editing ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            {editing ? 'Edit Courier Entry' : 'Add Courier Entry'}
          </CardTitle>
          <CardDescription>
            Required fields are stored in Supabase. Optional status and remarks are available for future workflow tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="courier_date">Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="courier_date" type="date" className="pl-9" {...register('courier_date')} />
                </div>
                {errors.courier_date && <p className="text-xs text-destructive">{errors.courier_date.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignee">Consignee (Receiver) *</Label>
                <Input id="consignee" placeholder="Receiver name" {...register('consignee')} />
                {errors.consignee && <p className="text-xs text-destructive">{errors.consignee.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignor">Consignor (Sender) *</Label>
                <Input id="consignor" placeholder="Sender name" {...register('consignor')} />
                {errors.consignor && <p className="text-xs text-destructive">{errors.consignor.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="courier_name">Courier Name *</Label>
                <Input id="courier_name" placeholder="Courier company / person" {...register('courier_name')} />
                {errors.courier_name && <p className="text-xs text-destructive">{errors.courier_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="document_tracking_number">Document / Tracking Number (DOCT NO.)</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="document_tracking_number" placeholder="Optional DOCT / tracking no." className="pl-9" {...register('document_tracking_number')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="location" placeholder="Location" className="pl-9" {...register('location')} />
                </div>
                {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status (Optional)</Label>
                <Input id="status" placeholder="e.g., Pending, Delivered" {...register('status')} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Textarea id="remarks" placeholder="Any additional notes" className="min-h-[44px]" {...register('remarks')} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {editing && (
                <Button type="button" variant="outline" onClick={handleCancelEdit} className="gap-2 sm:w-40">
                  <X className="w-4 h-4" />
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" disabled={submitting} className="gap-2 sm:w-48">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                {editing ? 'Update Entry' : 'Add Entry'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Outward Courier Records</CardTitle>
              <CardDescription>Search, view, or edit records from the outward courier log.</CardDescription>
            </div>
            <div className="relative sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search consignee, consignor, DOCT no..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <PackageCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{records?.length ? 'No records match your search' : 'No outward courier records yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Date', 'Consignee', 'Consignor', 'Courier', 'DOCT No.', 'Location', 'Status', 'Remarks', 'Actions'].map((header) => (
                      <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">{formatDate(record.courier_date)}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{record.consignee}</td>
                      <td className="px-4 py-3 text-xs">{record.consignor}</td>
                      <td className="px-4 py-3 text-xs">{record.courier_name}</td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {record.document_tracking_number
                          ? <span className="px-1.5 py-0.5 rounded bg-gray-100">{record.document_tracking_number}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">{record.location}</td>
                      <td className="px-4 py-3 text-xs">
                        {record.status ? <Badge variant="outline">{record.status}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[220px]">
                        <span className="line-clamp-2">{record.remarks || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(record)} className="gap-1.5">
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
