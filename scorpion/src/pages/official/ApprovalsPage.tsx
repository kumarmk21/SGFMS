import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, ArrowLeft, Loader2, CheckCircle, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import VisitorPhotoThumbnail from '@/components/visitor/VisitorPhotoThumbnail';
import { useAuth } from '@/context/AuthContext';
import { useCheckIns, useApproveCheckOut } from '@/hooks/useVisitors';
import type { CheckIn } from '@/types';
import { cn, formatDateTime, getInitials, getVisitorTypeColor, getVisitorTypeLabel, timeAgo } from '@/lib/utils';

export default function ApprovalsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [approveTarget, setApproveTarget] = useState<CheckIn | null>(null);
  const [approvedId, setApprovedId] = useState<string | null>(null);

  const { data: checkIns, isLoading } = useCheckIns({ officialId: profile?.id });
  const approveCheckOut = useApproveCheckOut();

  const awaitingApproval = checkIns?.filter(c => c.status === 'checked_in' || c.status === 'pending_approval') ?? [];
  const recentlyApproved = checkIns?.filter(c => c.status === 'checked_out').slice(0, 10) ?? [];

  const handleApprove = async () => {
    if (!approveTarget || !profile) return;
    await approveCheckOut.mutateAsync({
      checkInId: approveTarget.id,
      officialId: profile.id,
    });
    setApprovedId(approveTarget.id);
    setApproveTarget(null);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Visit Approvals</h1>
          <p className="text-sm text-muted-foreground">Sign off on completed visits</p>
        </div>
      </div>

      {/* Awaiting Approval */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Awaiting Sign-Off ({awaitingApproval.length})
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : awaitingApproval.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">All clear!</p>
              <p className="text-xs">No visits waiting for your approval</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {awaitingApproval.map((checkIn) => (
              <Card
                key={checkIn.id}
                className={cn(
                  'border-2 transition-all',
                  approvedId === checkIn.id
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 hover:shadow-md'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <VisitorPhotoThumbnail
                      src={(checkIn as any).visitor?.photo_url}
                      alt={`${(checkIn as any).visitor?.full_name ?? 'Visitor'} photo`}
                      fallback={getInitials((checkIn as any).visitor?.full_name ?? '?')}
                      className="h-12 w-12"
                      fallbackClassName="text-sm font-semibold"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{(checkIn as any).visitor?.full_name}</p>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getVisitorTypeColor((checkIn as any).visitor?.visitor_type))}>
                          {getVisitorTypeLabel((checkIn as any).visitor?.visitor_type)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{(checkIn as any).visitor?.mobile_number}</p>
                      {checkIn.purpose_of_visit && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {checkIn.purpose_of_visit}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Checked in {timeAgo(checkIn.check_in_time)} · {formatDateTime(checkIn.check_in_time)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {approvedId === checkIn.id ? (
                      <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Approved
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setApproveTarget(checkIn)}
                      >
                        <CheckSquare className="w-4 h-4" />
                        Approve Check-Out
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recently Approved */}
      {recentlyApproved.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Recently Approved
          </p>
          <Card>
            <CardContent className="p-0 divide-y">
              {recentlyApproved.map((checkIn) => (
                <div key={checkIn.id} className="flex items-center gap-3 px-4 py-3">
                  <VisitorPhotoThumbnail
                    src={(checkIn as any).visitor?.photo_url}
                    alt={`${(checkIn as any).visitor?.full_name ?? 'Visitor'} photo`}
                    fallback={getInitials((checkIn as any).visitor?.full_name ?? '?')}
                    className="h-9 w-9"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{(checkIn as any).visitor?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(checkIn.check_in_time)}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Checked Out</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Check-Out</DialogTitle>
            <DialogDescription>
              Confirm that <strong>{(approveTarget as any)?.visitor?.full_name}</strong> has completed
              their visit and is leaving the premises.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {approveTarget && (
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><span className="font-medium">Visitor:</span> {(approveTarget as any).visitor?.full_name}</p>
                <p><span className="font-medium">Check-in:</span> {formatDateTime(approveTarget.check_in_time)}</p>
                {approveTarget.purpose_of_visit && (
                  <p><span className="font-medium">Purpose:</span> {approveTarget.purpose_of_visit}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approveCheckOut.isPending} className="gap-2">
              {approveCheckOut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Confirm & Sign Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
