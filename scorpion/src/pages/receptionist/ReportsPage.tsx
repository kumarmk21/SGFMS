import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, RefreshCw, Users, Package,
  Calendar, Clock, Search, Filter, ChevronDown,
  TrendingUp, CheckCircle2, AlertCircle, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  cn, formatDateTime, formatDate, formatTime,
  getVisitorTypeLabel, getVisitorTypeColor, getStatusColor, getStatusLabel,
} from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisitorRow {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  purpose_of_visit: string | null;
  visitor: { full_name: string; mobile_number: string; visitor_type: string } | null;
  official: { full_name: string; department: string | null; designation: string | null } | null;
}

interface CourierRow {
  id: string;
  created_at: string;
  sender_name: string;
  sender_address: string;
  tracking_number: string | null;
  package_weight: string | null;
  package_description: string;
  number_of_packages: number;
  recipient: { full_name: string; department: string | null } | null;
  check_in: { visitor: { full_name: string; mobile_number: string } | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }
function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function duration(checkIn: string, checkOut: string | null): string {
  if (!checkOut) return '—';
  const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useVisitorReport(from: string, to: string, type: string, status: string) {
  return useQuery({
    queryKey: ['report-visitors', from, to, type, status],
    queryFn: async () => {
      let q = supabase
        .from('check_ins')
        .select(`
          id, check_in_time, check_out_time, status, purpose_of_visit,
          visitor:visitors(full_name, mobile_number, visitor_type),
          official:profiles!check_ins_official_id_fkey(full_name, department, designation)
        `)
        .gte('check_in_time', `${from}T00:00:00`)
        .lte('check_in_time', `${to}T23:59:59`)
        .order('check_in_time', { ascending: false });

      if (status && status !== 'all') q = q.eq('status', status);

      const { data, error } = await q;
      if (error) throw error;

      let rows = (data ?? []) as unknown as VisitorRow[];
      if (type && type !== 'all') {
        rows = rows.filter(r => r.visitor?.visitor_type === type);
      }
      return rows;
    },
  });
}

function useCourierReport(from: string, to: string) {
  return useQuery({
    queryKey: ['report-couriers', from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courier_receipts')
        .select(`
          id, created_at, sender_name, sender_address,
          tracking_number, package_weight, package_description, number_of_packages,
          recipient:profiles!courier_receipts_recipient_id_fkey(full_name, department),
          check_in:check_ins(visitor:visitors(full_name, mobile_number))
        `)
        .gte('created_at', `${from}T00:00:00`)
        .lte('created_at', `${to}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as CourierRow[];
    },
  });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Date range picker ────────────────────────────────────────────────────────

function DateRangeBar({ from, to, onFrom, onTo, onRefresh, loading }: {
  from: string; to: string;
  onFrom: (v: string) => void; onTo: (v: string) => void;
  onRefresh: () => void; loading: boolean;
}) {
  const presets = [
    { label: 'Today',       from: todayStr(),    to: todayStr() },
    { label: 'This month',  from: monthStartStr(), to: todayStr() },
    { label: 'Last 7 days', from: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]; })(), to: todayStr() },
    { label: 'Last 30 days',from: (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().split('T')[0]; })(), to: todayStr() },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <input type="date" value={from} max={to} onChange={e => onFrom(e.target.value)}
          className="text-sm border-0 outline-none bg-transparent" />
        <span className="text-muted-foreground text-sm">to</span>
        <input type="date" value={to} min={from} max={todayStr()} onChange={e => onTo(e.target.value)}
          className="text-sm border-0 outline-none bg-transparent" />
      </div>
      <div className="flex gap-1.5">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => { onFrom(p.from); onTo(p.to); }}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
              from === p.from && to === p.to
                ? 'border-[#CC0000] bg-[#CC0000] text-white'
                : 'border-border bg-white hover:bg-gray-50 text-muted-foreground'
            )}
          >{p.label}</button>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="gap-1.5 ml-auto">
        <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        Refresh
      </Button>
    </div>
  );
}

// ─── Visitor Report ───────────────────────────────────────────────────────────

function VisitorReport() {
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo]     = useState(todayStr());
  const [typeFilter, setTypeFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useVisitorReport(from, to, typeFilter, statusFilter);

  const filtered = useMemo(() => {
    if (!search || !data) return data ?? [];
    const q = search.toLowerCase();
    return data.filter(r =>
      r.visitor?.full_name.toLowerCase().includes(q) ||
      r.visitor?.mobile_number.includes(q) ||
      r.official?.full_name.toLowerCase().includes(q) ||
      r.purpose_of_visit?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const stats = useMemo(() => ({
    total:    filtered.length,
    checkedIn:  filtered.filter(r => r.status === 'checked_in').length,
    pending:    filtered.filter(r => r.status === 'pending_approval').length,
    checkedOut: filtered.filter(r => r.status === 'checked_out').length,
    visitors:   filtered.filter(r => r.visitor?.visitor_type === 'visitor').length,
    delivery:   filtered.filter(r => r.visitor?.visitor_type === 'delivery_agent').length,
    courier:    filtered.filter(r => r.visitor?.visitor_type === 'courier').length,
  }), [filtered]);

  const handleExport = () => {
    const headers = ['Date', 'Time', 'Visitor Name', 'Mobile', 'Type', 'Purpose', 'Host Official', 'Department', 'Check-Out', 'Duration', 'Status'];
    const rows = filtered.map(r => [
      formatDate(r.check_in_time),
      formatTime(r.check_in_time),
      r.visitor?.full_name ?? '',
      r.visitor?.mobile_number ?? '',
      getVisitorTypeLabel(r.visitor?.visitor_type ?? ''),
      r.purpose_of_visit ?? '',
      r.official?.full_name ?? '',
      r.official?.department ?? '',
      r.check_out_time ? formatDateTime(r.check_out_time) : '',
      duration(r.check_in_time, r.check_out_time),
      getStatusLabel(r.status),
    ]);
    exportCSV(`visitor_report_${from}_to_${to}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      <DateRangeBar from={from} to={to} onFrom={setFrom} onTo={setTo} onRefresh={refetch} loading={isLoading} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Visits"       value={stats.total}      icon={Users}          color="bg-blue-100 text-blue-600" />
        <StatCard label="Currently Inside"   value={stats.checkedIn}  icon={TrendingUp}     color="bg-green-100 text-green-600" />
        <StatCard label="Pending Approval"   value={stats.pending}    icon={AlertCircle}    color="bg-yellow-100 text-yellow-600" />
        <StatCard label="Checked Out"        value={stats.checkedOut} icon={CheckCircle2}   color="bg-gray-100 text-gray-600" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Visitors"       value={stats.visitors} icon={Users}    color="bg-red-100 text-red-600" />
        <StatCard label="Delivery Agents" value={stats.delivery} icon={TrendingUp} color="bg-blue-100 text-blue-600" />
        <StatCard label="Couriers"       value={stats.courier}  icon={Package}  color="bg-purple-100 text-purple-600" />
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search visitor, mobile, host…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="visitor">Visitor</SelectItem>
            <SelectItem value="delivery_agent">Delivery Agent</SelectItem>
            <SelectItem value="courier">Courier</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={!filtered.length} className="gap-1.5">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No visitor records for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['#', 'Date & Time', 'Visitor', 'Mobile', 'Type', 'Purpose', 'Host Official', 'Check-Out', 'Duration', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r, i) => (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{filtered.length - i}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-xs">{formatDate(r.check_in_time)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(r.check_in_time)}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-xs whitespace-nowrap">{r.visitor?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono">{r.visitor?.mobile_number ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', getVisitorTypeColor(r.visitor?.visitor_type ?? ''))}>
                          {getVisitorTypeLabel(r.visitor?.visitor_type ?? '')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[140px]">
                        <span className="line-clamp-2">{r.purpose_of_visit ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-medium">{r.official?.full_name ?? '—'}</p>
                        {r.official?.department && <p className="text-xs text-muted-foreground">{r.official.department}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                        {r.check_out_time ? formatTime(r.check_out_time) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {duration(r.check_in_time, r.check_out_time)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', getStatusColor(r.status))}>
                          {getStatusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-gray-50/60 text-xs text-muted-foreground">
            Showing {filtered.length} record{filtered.length !== 1 ? 's' : ''} · {from} to {to}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Courier Report ───────────────────────────────────────────────────────────

function CourierReport() {
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo]     = useState(todayStr());
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useCourierReport(from, to);

  const filtered = useMemo(() => {
    if (!search || !data) return data ?? [];
    const q = search.toLowerCase();
    return data.filter(r =>
      r.sender_name.toLowerCase().includes(q) ||
      r.recipient?.full_name.toLowerCase().includes(q) ||
      (r.tracking_number ?? '').toLowerCase().includes(q) ||
      r.package_description.toLowerCase().includes(q) ||
      r.check_in?.visitor?.full_name.toLowerCase().includes(q)
    );
  }, [data, search]);

  const stats = useMemo(() => ({
    receipts: filtered.length,
    packages: filtered.reduce((s, r) => s + r.number_of_packages, 0),
    recipients: new Set(filtered.map(r => r.recipient?.full_name).filter(Boolean)).size,
    withTracking: filtered.filter(r => r.tracking_number).length,
  }), [filtered]);

  const handleExport = () => {
    const headers = ['Date', 'Time', 'Courier Person', 'Courier Mobile', 'Sender Name', 'Sender Address', 'Tracking #', 'Packages', 'Weight', 'Description', 'Recipient', 'Department'];
    const rows = filtered.map(r => [
      formatDate(r.created_at),
      formatTime(r.created_at),
      r.check_in?.visitor?.full_name ?? '',
      r.check_in?.visitor?.mobile_number ?? '',
      r.sender_name,
      r.sender_address,
      r.tracking_number ?? '',
      String(r.number_of_packages),
      r.package_weight ?? '',
      r.package_description,
      r.recipient?.full_name ?? '',
      r.recipient?.department ?? '',
    ]);
    exportCSV(`courier_report_${from}_to_${to}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4">
      <DateRangeBar from={from} to={to} onFrom={setFrom} onTo={setTo} onRefresh={refetch} loading={isLoading} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Receipts"    value={stats.receipts}     icon={Package}        color="bg-purple-100 text-purple-600" />
        <StatCard label="Total Packages"    value={stats.packages}     icon={TrendingUp}     color="bg-blue-100 text-blue-600" />
        <StatCard label="Recipients"        value={stats.recipients}   icon={Users}          color="bg-green-100 text-green-600" />
        <StatCard label="With Tracking #"   value={stats.withTracking} icon={CheckCircle2}   color="bg-gray-100 text-gray-600" />
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search sender, recipient, tracking…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={!filtered.length} className="gap-1.5 ml-auto">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No courier records for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['#', 'Date & Time', 'Courier Person', 'Sender', 'Tracking #', 'Pkgs', 'Weight', 'Description', 'Recipient', 'Dept'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r, i) => (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{filtered.length - i}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-xs">{formatDate(r.created_at)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(r.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-semibold">{r.check_in?.visitor?.full_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.check_in?.visitor?.mobile_number ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[140px]">
                        <p className="text-xs font-semibold">{r.sender_name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{r.sender_address}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {r.tracking_number
                          ? <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{r.tracking_number}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                          {r.number_of_packages}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.package_weight ?? '—'}</td>
                      <td className="px-4 py-3 text-xs max-w-[140px]">
                        <span className="line-clamp-2">{r.package_description}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-semibold">{r.recipient?.full_name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.recipient?.department ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-gray-50/60 text-xs text-muted-foreground">
            {stats.receipts} receipt{stats.receipts !== 1 ? 's' : ''} · {stats.packages} package{stats.packages !== 1 ? 's' : ''} total · {from} to {to}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const navigate = useNavigate();
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Visitor & Courier records with export</p>
        </div>
      </div>

      <Tabs defaultValue="visitors">
        <TabsList className="mb-6 h-11">
          <TabsTrigger value="visitors" className="gap-2 px-6">
            <Users className="w-4 h-4" />
            Visitor Report
          </TabsTrigger>
          <TabsTrigger value="couriers" className="gap-2 px-6">
            <Package className="w-4 h-4" />
            Courier Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visitors">
          <VisitorReport />
        </TabsContent>

        <TabsContent value="couriers">
          <CourierReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
