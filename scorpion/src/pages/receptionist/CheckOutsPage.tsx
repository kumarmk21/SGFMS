import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Clock, ArrowLeft, Loader2, LogOut, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import VisitorPhotoThumbnail from '@/components/visitor/VisitorPhotoThumbnail';
import { useAuth } from '@/context/AuthContext';
import { useCheckIns, useApproveCheckOut } from '@/hooks/useVisitors';
import type { CheckIn } from '@/types';
import { cn, formatDateTime, formatTime, getInitials, getVisitorTypeColor, getVisitorTypeLabel, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';

export default function CheckOutsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [checkOutTarget, setCheckOutTarget] = useState<CheckIn | null>(null);

  const { data: allCheckIns, isLoading } = useCheckIns({});
  const approveCheckOut = useApproveCheckOut();

  const active = allCheckIns?.filter(c => c.status === 'checked_in') ?? [];
  const pending = allCheckIns?.filter(c => c.status === 'pending_approval') ?? [];
  const completed = allCheckIns?.filter(c => c.status === 'checked_out').slice(0, 20) ?? [];

  const filterFn = (items: typeof active) => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(c =>
      (c as any).visitor?.full_name?.toLowerCase().includes(q) ||
      (c as any).visitor?.mobile_number?.includes(q) ||
      (c as any).official?.full_name?.toLowerCase().includes(q)
    );
  };

  const handleManualCheckOut = async () => {
    if (!checkOutTarget || !profile) return;
    await approveCheckOut.mutateAsync({
      checkInId: checkOutTarget.id,
      officialId: profile.id,
    });
    setCheckOutTarget(null);
  };

  function CheckInCard({ checkIn, showCheckOut = false }: { checkIn: CheckIn; showCheckOut?: boolean }) {
    return (
      <div className="flex items-center gap-4 px-4 py-3">
        <VisitorPhotoThumbnail
          src={(checkIn as any).visitor?.photo_url}
          alt={`${(checkIn as any).visitor?.full_name ?? 'Visitor'} photo`}
          fallback={getInitials((checkIn as any).visitor?.full_name ?? '?')}
          className="h-10 w-10"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{(checkIn as any).visitor?.full_name}</p>
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getVisitorTypeColor((checkIn as any).visitor?.visitor_type))}>
              {getVisitorTypeLabel((checkIn as any).visitor?.visitor_type)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{(checkIn as any).visitor?.mobile_number}</p>
          {(checkIn as any).official && (
            <p className="text-xs text-muted-foreground">Meeting: {(checkIn as any).official?.full_name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />
            {checkIn.status === 'checked_out' && checkIn.check_out_time
              ? formatTime(checkIn.check_out_time)
              : timeAgo(checkIn.check_in_time)}
          </p>
          {showCheckOut && checkIn.status === 'checked_in' && (
            <Button
              size="sm"
              variant="outline"
              className="mt-1 h-7 text-xs gap-1"
              onClick={() => setCheckOutTarget(checkIn)}
            >
              <LogOut className="w-3 h-3" />
              Check Out
            </Button>
          )}
          {checkIn.status === 'pending_approval' && (
            <Badge variant="warning" className="mt-1 text-xs">
              Awaiting Approval
            </Badge>
          )}
          {checkIn.status === 'checked_out' && (
            <Badge variant="secondary" className="mt-1 text-xs">
              Checked Out
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Check-Out Management</h1>
          <p className="text-sm text-muted-foreground">Manage visitor departures</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, mobile, or official..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="active" className="flex-1">
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filterFn(active).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No active visitors</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filterFn(active).map(c => (
                    <CheckInCard key={c.id} checkIn={c} showCheckOut />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {filterFn(pending).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No pending approvals</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filterFn(pending).map(c => <CheckInCard key={c.id} checkIn={c} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              {filterFn(completed).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No completed check-outs today</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filterFn(completed).map(c => <CheckInCard key={c.id} checkIn={c} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Check-Out Dialog */}
      <Dialog open={!!checkOutTarget} onOpenChange={() => setCheckOutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Check-Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to check out <strong>{(checkOutTarget as any)?.visitor?.full_name}</strong>?
              This will record an immediate check-out without official approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOutTarget(null)}>Cancel</Button>
            <Button onClick={handleManualCheckOut} disabled={approveCheckOut.isPending}>
              {approveCheckOut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Check-Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
