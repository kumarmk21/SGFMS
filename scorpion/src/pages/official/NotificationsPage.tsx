import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Check, CheckCheck, Package, User, Truck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '@/hooks/useNotifications';
import type { Notification } from '@/types';
import { cn, timeAgo } from '@/lib/utils';

function NotificationIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    courier: Package,
    delivery_agent: Truck,
    visitor: User,
  };
  const visitorType = type?.toLowerCase() ?? 'visitor';
  const Icon = icons[visitorType] ?? Bell;
  return <Icon className="w-4 h-4" />;
}

function NotificationCard({ notification }: { notification: Notification }) {
  const markRead = useMarkNotificationRead();
  const isUnread = notification.status === 'sent';
  const visitorType = (notification.check_in as any)?.visitor?.visitor_type ?? '';

  const bgColors: Record<string, string> = {
    courier: 'bg-purple-100 text-purple-600',
    delivery_agent: 'bg-blue-100 text-blue-600',
    visitor: 'bg-red-100 text-[#CC0000]',
  };

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-4 transition-colors',
        isUnread ? 'bg-blue-50/60' : ''
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', bgColors[visitorType] ?? 'bg-gray-100 text-gray-600')}>
        <NotificationIcon type={visitorType} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm', isUnread ? 'font-semibold' : 'font-medium')}>{notification.title}</p>
          {isUnread && (
            <button
              onClick={() => markRead.mutate(notification.id)}
              className="shrink-0 p-1 rounded hover:bg-blue-100 transition-colors"
              title="Mark as read"
            >
              <Check className="w-3.5 h-3.5 text-blue-500" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notification.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{timeAgo(notification.created_at)}</span>
          {isUnread && <Badge variant="info" className="text-xs h-4 px-1.5">New</Badge>}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications(profile?.id);
  const markAllRead = useMarkAllRead();

  const unread = notifications?.filter(n => n.status === 'sent') ?? [];
  const read = notifications?.filter(n => n.status === 'read') ?? [];

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unread.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate(profile!.id)}
            disabled={markAllRead.isPending}
            className="gap-1.5 text-xs"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse text-muted-foreground text-sm">Loading notifications...</div>
        </div>
      ) : !notifications?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <h3 className="font-semibold mb-1">No notifications yet</h3>
          <p className="text-sm">You'll be notified when visitors arrive</p>
        </div>
      ) : (
        <div className="space-y-4">
          {unread.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground px-1 mb-2 uppercase tracking-wide">New</p>
              <Card className="overflow-hidden border-blue-200">
                <CardContent className="p-0 divide-y">
                  {unread.map(n => <NotificationCard key={n.id} notification={n} />)}
                </CardContent>
              </Card>
            </div>
          )}
          {read.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground px-1 mb-2 uppercase tracking-wide">Earlier</p>
              <Card className="overflow-hidden">
                <CardContent className="p-0 divide-y">
                  {read.map(n => <NotificationCard key={n.id} notification={n} />)}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
