import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, Package, LogOut, Bell, Users, Settings,
  Menu, X, CheckSquare
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
    { label: 'Dashboard',         icon: LayoutDashboard, href: '/receptionist',          roles: ['receptionist', 'admin'] },
    { label: 'New Check-In',      icon: UserPlus,        href: '/receptionist/checkin',  roles: ['receptionist', 'admin'] },
    { label: 'Courier Receipts',  icon: Package,         href: '/receptionist/couriers', roles: ['receptionist', 'admin'] },
    { label: 'Check-Out Approvals', icon: CheckSquare,   href: '/receptionist/checkouts',roles: ['receptionist', 'admin'] },
    { label: 'Dashboard',         icon: LayoutDashboard, href: '/official',              roles: ['official'] },
    { label: 'Notifications',     icon: Bell,            href: '/official/notifications',roles: ['official'], badge: unreadCount ?? 0 },
    { label: 'Pending Approvals', icon: CheckSquare,     href: '/official/approvals',    roles: ['official'] },
    { label: 'User Management',   icon: Users,           href: '/admin/users',           roles: ['admin'] },
    { label: 'Settings',          icon: Settings,        href: '/admin/settings',        roles: ['admin'] },
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
      {/* Brand header — Scorpion red */}
      <div className="flex items-center justify-center px-4 py-5 bg-[#CC0000]">
        <img
          src="/scorpion-logo.png"
          alt="Scorpion"
          className="h-12 w-auto object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
          }}
        />
        {/* Fallback text logo */}
        <div className="hidden items-center gap-2">
          <span className="text-white font-bold text-xl tracking-tight">Scorpion</span>
          <span className="text-white/70 text-xs font-medium">VMS</span>
        </div>
      </div>

      {/* Role pill */}
      <div className="px-4 py-2 bg-[#aa0000]">
        <p className="text-center text-xs text-white/80 font-medium uppercase tracking-widest">
          Visitor Management
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/receptionist' &&
              item.href !== '/official' &&
              location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#CC0000] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-red-50 hover:text-[#CC0000]'
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

      <div className="p-3 border-t bg-gray-50/60">
        <div className="flex items-center gap-3 mb-2 px-2">
          <Avatar className="h-9 w-9 border-2 border-[#CC0000]/20">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[#CC0000]/10 text-[#CC0000] text-xs font-bold">
              {getInitials(profile?.full_name ?? 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-[#CC0000] hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r shadow-sm shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white flex flex-col shadow-2xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#CC0000] shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img
              src="/scorpion-logo.png"
              alt="Scorpion"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            {(unreadCount ?? 0) > 0 && (
              <Link to="/official/notifications" className="relative p-1.5">
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 text-[#CC0000] rounded-full text-xs font-bold flex items-center justify-center">
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
