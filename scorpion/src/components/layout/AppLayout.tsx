import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, Package, LogOut, Bell, Users, Settings,
  Menu, X, CheckSquare, ChevronRight, Shield
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/useNotifications';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: string[];
  badge?: number;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: unreadCount } = useUnreadCount(profile?.id);

  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/receptionist', roles: ['receptionist', 'admin'] },
    { label: 'New Check-In', icon: UserPlus, href: '/receptionist/checkin', roles: ['receptionist', 'admin'] },
    { label: 'Courier Receipts', icon: Package, href: '/receptionist/couriers', roles: ['receptionist', 'admin'] },
    { label: 'Check-Out Approvals', icon: CheckSquare, href: '/receptionist/checkouts', roles: ['receptionist', 'admin'] },
    { label: 'Dashboard', icon: LayoutDashboard, href: '/official', roles: ['official'] },
    { label: 'Notifications', icon: Bell, href: '/official/notifications', roles: ['official'], badge: unreadCount ?? 0 },
    { label: 'Pending Approvals', icon: CheckSquare, href: '/official/approvals', roles: ['official'] },
    { label: 'User Management', icon: Users, href: '/admin/users', roles: ['admin'] },
    { label: 'Settings', icon: Settings, href: '/admin/settings', roles: ['admin'] },
  ];

  const filteredNav = navItems.filter(item =>
    profile && item.roles.includes(profile.role)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-6 border-b">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Scorpion</h1>
          <p className="text-xs text-muted-foreground">Visitor Management</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
            (item.href !== '/receptionist' && item.href !== '/official' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3 px-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(profile?.full_name ?? 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white flex flex-col shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-md hover:bg-accent">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm">Scorpion VMS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(unreadCount ?? 0) > 0 && (
              <Link to="/official/notifications" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
