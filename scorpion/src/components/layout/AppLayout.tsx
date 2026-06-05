import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, Package, LogOut, Bell, Users, Settings,
  Menu, X, CheckSquare, BarChart2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/useNotifications';
import ScorpionLogo, { ScorpionTextFallback } from './ScorpionLogo';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: string[];
  badge?: number;
}

const BRAND = '#CC0000';
const BRAND_DARK = '#A80000';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: unreadCount } = useUnreadCount(profile?.id);

  const navItems: NavItem[] = [
    { label: 'Dashboard',           icon: LayoutDashboard, href: '/receptionist',           roles: ['receptionist', 'admin'] },
    { label: 'New Check-In',         icon: UserPlus,        href: '/receptionist/checkin',   roles: ['receptionist', 'admin'] },
    { label: 'Courier Receipts',     icon: Package,         href: '/receptionist/couriers',  roles: ['receptionist', 'admin'] },
    { label: 'Check-Out Approvals',  icon: CheckSquare,     href: '/receptionist/checkouts', roles: ['receptionist', 'admin'] },
    { label: 'Reports',              icon: BarChart2,       href: '/receptionist/reports',   roles: ['receptionist', 'admin'] },
    { label: 'Dashboard',            icon: LayoutDashboard, href: '/official',               roles: ['official'] },
    { label: 'Notifications',        icon: Bell,            href: '/official/notifications', roles: ['official'], badge: unreadCount ?? 0 },
    { label: 'Pending Approvals',    icon: CheckSquare,     href: '/official/approvals',     roles: ['official'] },
    { label: 'User Management',      icon: Users,           href: '/admin/users',            roles: ['admin'] },
    { label: 'Settings',             icon: Settings,        href: '/admin/settings',         roles: ['admin'] },
  ];

  const filteredNav = navItems.filter(item => profile && item.roles.includes(profile.role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div
        className="flex flex-col items-center justify-center px-6 py-5 gap-1"
        style={{ background: `linear-gradient(160deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
      >
        <ScorpionLogo heightClass="h-14" />
        <ScorpionTextFallback />
        <p className="text-white/60 text-[10px] font-semibold uppercase tracking-[0.18em] mt-1">
          Visitor Management
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:text-[#CC0000] hover:bg-red-50'
              )}
              style={isActive ? { backgroundColor: BRAND } : {}}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1.5">
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t bg-gray-50/80">
        <div className="flex items-center gap-3 mb-2 px-2">
          <Avatar className="h-9 w-9 border-2" style={{ borderColor: `${BRAND}33` }}>
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback
              className="text-xs font-bold"
              style={{ backgroundColor: `${BRAND}15`, color: BRAND }}
            >
              {getInitials(profile?.full_name ?? 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.designation ?? profile?.role}
            </p>
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
          <aside className="relative w-72 bg-white flex flex-col shadow-2xl z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 shadow-md"
          style={{ background: `linear-gradient(90deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <ScorpionLogo heightClass="h-8" />
          </div>
          <div className="flex items-center gap-2">
            {(unreadCount ?? 0) > 0 && (
              <Link to="/official/notifications" className="relative p-1.5">
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute top-0 right-0 w-4 h-4 bg-yellow-300 text-[#CC0000] rounded-full text-xs font-bold flex items-center justify-center leading-none">
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
