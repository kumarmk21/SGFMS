import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckSquare, Clock, Users, ArrowRight, RefreshCw, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useCheckIns } from '@/hooks/useVisitors';
import { useUnreadCount, useNotifications } from '@/hooks/useNotifications';
import { useToggleAvailability } from '@/hooks/useProfiles';
import { cn, formatTime, getInitials, getVisitorTypeColor, getVisitorTypeLabel, timeAgo } from '@/lib/utils';

export default function OfficialDashboard() {
  const { profile, refreshProfile } = useAuth();
  const { data: unreadCount } = useUnreadCount(profile?.id);
  const { data: recentNotifications } = useNotifications(profile?.id);
  const { data: checkIns } = useCheckIns({ officialId: profile?.id });
  const toggleAvailability = useToggleAvailability();

  const activeVisitors = checkIns?.filter(c => c.status === 'checked_in') ?? [];
  const pendingApprovals = checkIns?.filter(c => c.status === 'pending_approval') ?? [];

  const handleToggleAvailability = async (checked: boolean) => {
    if (!profile) return;
    await toggleAvailability.mutateAsync({ id: profile.id, isAvailable: checked });
    await refreshProfile();
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold">{greeting}!</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{profile?.full_name} · {profile?.designation}</p>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border px-4 py-2.5 shadow-sm">
          <div className={cn('w-2.5 h-2.5 rounded-full', profile?.is_available ? 'bg-green-500' : 'bg-gray-400')} />
          <Label htmlFor="availability" className="text-sm font-medium cursor-pointer">
            {profile?.is_available ? 'Available' : 'Unavailable'}
          </Label>
          <Switch
            id="availability"
            checked={profile?.is_available ?? false}
            onCheckedChange={handleToggleAvailability}
            disabled={toggleAvailability.isPending}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeVisitors.length}</p>
                <p className="text-xs text-muted-foreground">Active Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingApprovals.length}</p>
                <p className="text-xs text-muted-foreground">Pending Sign-off</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Unread Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals alert */}
      {pendingApprovals.length > 0 && (
        <Link to="/official/approvals">
          <Card className="mb-6 border-yellow-200 bg-yellow-50 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-200 rounded-xl flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-yellow-700" />
                </div>
                <div>
                  <p className="font-semibold text-yellow-900">
                    {pendingApprovals.length} visitor{pendingApprovals.length > 1 ? 's' : ''} waiting for check-out approval
                  </p>
                  <p className="text-xs text-yellow-700">Your sign-off is required</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-yellow-700" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link to="/official/notifications">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Notifications</p>
                {(unreadCount ?? 0) > 0 && (
                  <Badge variant="destructive" className="text-xs h-5 mt-0.5">{unreadCount} new</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/official/approvals">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Approvals</p>
                <p className="text-xs text-muted-foreground">Sign off visits</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <Link to="/official/notifications">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!recentNotifications?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.slice(0, 5).map((notif) => (
                <div key={notif.id} className={cn('flex gap-3 px-4 py-3', notif.status === 'sent' && 'bg-blue-50/50')}>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(notif.created_at)}</p>
                  </div>
                  {notif.status === 'sent' && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
