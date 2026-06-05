import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, Package, CheckSquare, Users, Clock, TrendingUp,
  ArrowRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useTodayCheckIns } from '@/hooks/useVisitors';
import { useTodayCourierReceipts } from '@/hooks/useCourier';
import {
  cn, formatTime, getInitials, getVisitorTypeColor,
  getVisitorTypeLabel, getStatusColor, getStatusLabel
} from '@/lib/utils';

function StatCard({ title, value, icon: Icon, color, href }: {
  title: string; value: number; icon: React.ElementType; color: string; href?: string;
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{content}</Link> : content;
}

export default function ReceptionistDashboard() {
  const { profile } = useAuth();
  const { data: checkIns, isLoading, refetch } = useTodayCheckIns();
  const { data: couriers } = useTodayCourierReceipts();

  const checkedIn = checkIns?.filter(c => c.status === 'checked_in') ?? [];
  const pending = checkIns?.filter(c => c.status === 'pending_approval') ?? [];
  const checkedOut = checkIns?.filter(c => c.status === 'checked_out') ?? [];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {profile?.full_name?.split(' ')[0]}!</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-sm font-medium text-gray-700">{profile?.full_name}</span>
            {profile?.designation && (
              <>
                <span className="text-muted-foreground text-sm">·</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#CC000015', color: '#CC0000' }}
                >
                  {profile.designation}
                </span>
              </>
            )}
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Currently Inside"
          value={checkedIn.length}
          icon={Users}
          color="bg-green-100 text-green-600"
          href="/receptionist/checkouts"
        />
        <StatCard
          title="Pending Approval"
          value={pending.length}
          icon={AlertCircle}
          color="bg-yellow-100 text-yellow-600"
          href="/receptionist/checkouts"
        />
        <StatCard
          title="Today's Couriers"
          value={couriers?.length ?? 0}
          icon={Package}
          color="bg-purple-100 text-purple-600"
          href="/receptionist/couriers"
        />
        <StatCard
          title="Total Today"
          value={checkIns?.length ?? 0}
          icon={TrendingUp}
          color="bg-blue-100 text-blue-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/receptionist/checkin">
          <Card className="hover:shadow-md transition-all hover:border-primary/50 cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                <UserPlus className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">New Check-In</p>
                <p className="text-xs text-muted-foreground">Register a visitor</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/receptionist/couriers">
          <Card className="hover:shadow-md transition-all hover:border-purple-200 cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Courier Receipt</p>
                <p className="text-xs text-muted-foreground">Log a package</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/receptionist/checkouts">
          <Card className="hover:shadow-md transition-all hover:border-yellow-200 cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Check-Outs</p>
                <p className="text-xs text-muted-foreground">
                  {pending.length > 0 ? `${pending.length} pending` : 'Manage exits'}
                </p>
              </div>
              {pending.length > 0 && (
                <Badge variant="warning">{pending.length}</Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Active Visitors Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Active Visitors Today</CardTitle>
            <Link to="/receptionist/checkouts">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : checkedIn.length === 0 && pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active visitors right now</p>
            </div>
          ) : (
            <div className="divide-y">
              {[...pending, ...checkedIn].slice(0, 10).map((checkIn) => (
                <div key={checkIn.id} className="flex items-center gap-4 px-6 py-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={(checkIn as any).visitor?.photo_url} />
                    <AvatarFallback className="text-xs bg-muted">
                      {getInitials((checkIn as any).visitor?.full_name ?? '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{(checkIn as any).visitor?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{(checkIn as any).visitor?.mobile_number}</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getVisitorTypeColor((checkIn as any).visitor?.visitor_type))}>
                      {getVisitorTypeLabel((checkIn as any).visitor?.visitor_type)}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(checkIn.check_in_time)}
                    </span>
                  </div>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(checkIn.status))}>
                    {getStatusLabel(checkIn.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
