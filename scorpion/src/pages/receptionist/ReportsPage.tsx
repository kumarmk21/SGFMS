import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, RefreshCw, Users, Package,
  Calendar, Clock, Search, Filter, ChevronDown,
  TrendingUp, CheckCircle2, AlertCircle, XCircle,
  Printer, FileText, UserCheck,
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

// Use IST for all date calculations (India Standard Time = UTC+05:30)
const IST_LOCALE = { timeZone: 'Asia/Kolkata' } as const;
function todayStr() {
  return new Date().toLocaleDateString('en-CA', IST_LOCALE); // YYYY-MM-DD in IST
}
function monthStartStr() {
  const d = new Date().toLocaleDateString('en-CA', IST_LOCALE);
  return d.slice(0, 7) + '-01';
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA', IST_LOCALE);
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
        .gte('check_in_time', `${from}T00:00:00+05:30`)
        .lte('check_in_time', `${to}T23:59:59+05:30`)
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
        .gte('created_at', `${from}T00:00:00+05:30`)
        .lte('created_at', `${to}T23:59:59+05:30`)
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
    { label: 'Last 7 days',  from: daysAgoStr(6),  to: todayStr() },
    { label: 'Last 30 days', from: daysAgoStr(29), to: todayStr() },
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

// ─── Acknowledgement Report ───────────────────────────────────────────────────

interface AckEntry {
  date:          string;
  time:          string;
  visitorName:   string;
  mobile:        string;
  senderName:    string;
  senderAddress: string;
  tracking:      string;
  packages:      string;
  weight:        string;
  description:   string;
}

function useAcknowledgementData(officialId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['ack-report', officialId, from, to],
    enabled: !!officialId,
    queryFn: async () => {
      const { data: couriers } = await supabase
        .from('courier_receipts')
        .select('created_at, sender_name, sender_address, tracking_number, number_of_packages, package_description, package_weight, check_in:check_ins(visitor:visitors(full_name, mobile_number))')
        .eq('recipient_id', officialId)
        .gte('created_at', `${from}T00:00:00+05:30`)
        .lte('created_at', `${to}T23:59:59+05:30`)
        .order('created_at', { ascending: true });

      return (couriers ?? []).map((r: any) => ({
        date:          formatDate(r.created_at),
        time:          formatTime(r.created_at),
        visitorName:   r.check_in?.visitor?.full_name ?? '—',
        mobile:        r.check_in?.visitor?.mobile_number ?? '—',
        senderName:    r.sender_name ?? '—',
        senderAddress: r.sender_address ?? '—',
        tracking:      r.tracking_number ?? '—',
        packages:      String(r.number_of_packages ?? 1),
        weight:        r.package_weight ?? '—',
        description:   r.package_description ?? '—',
      }));
    },
  });
}

function useOfficials() {
  return useQuery({
    queryKey: ['officials-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, department, designation')
        .eq('role', 'official')
        .order('full_name');
      return data ?? [];
    },
  });
}

function AcknowledgementReport() {
  const [officialId, setOfficialId] = useState('');
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo]     = useState(todayStr());
  const [search, setSearch] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const { data: officials } = useOfficials();
  const { data: rows, isLoading, refetch } = useAcknowledgementData(officialId, from, to);

  const official = officials?.find(o => o.id === officialId);

  const filteredOfficials = useMemo(() => {
    if (!officials) return [];
    if (!search) return officials;
    const q = search.toLowerCase();
    return officials.filter(o =>
      o.full_name.toLowerCase().includes(q) ||
      (o.department ?? '').toLowerCase().includes(q)
    );
  }, [officials, search]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Acknowledgement Report — ${official?.full_name ?? ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 28px; }
    .header { text-align: center; border-bottom: 3px solid #CC0000; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; color: #CC0000; letter-spacing: 1px; text-transform: uppercase; }
    .header h2 { font-size: 13px; color: #555; margin-top: 4px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; background: #f9f9f9; border: 1px solid #ddd; padding: 14px 16px; border-radius: 6px; }
    .meta-item { display: flex; gap: 8px; }
    .meta-label { color: #888; font-size: 11px; min-width: 110px; }
    .meta-value { font-weight: 600; color: #111; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #CC0000; }
    thead th { color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11px; vertical-align: top; }
    .summary { background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; }
    .summary-title { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .summary-box { text-align: center; }
    .summary-num { font-size: 20px; font-weight: 700; color: #CC0000; }
    .summary-lbl { font-size: 10px; color: #888; }
    .acknowledgement { border: 1px solid #ddd; border-radius: 6px; padding: 16px; margin-bottom: 28px; }
    .ack-title { font-size: 12px; font-weight: 700; color: #333; margin-bottom: 10px; text-transform: uppercase; letter-spacing: .5px; }
    .ack-text { font-size: 11px; color: #444; line-height: 1.7; margin-bottom: 16px; }
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 8px; }
    .sign-block { }
    .sign-line { border-bottom: 1px solid #333; margin-bottom: 6px; height: 32px; }
    .sign-label { font-size: 10px; color: #888; }
    .footer { text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
    .badge-visitor { color: #CC0000; font-weight: 600; }
    .badge-delivery { color: #1D4ED8; font-weight: 600; }
    .badge-courier { color: #7C3AED; font-weight: 600; }
    .status-in { color: #16a34a; }
    .status-out { color: #6b7280; }
    .status-pending { color: #d97706; }
    @media print {
      body { padding: 16px; }
      @page { margin: 8mm 10mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  ${content.innerHTML}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const totalPackages  = rows?.reduce((s, r) => s + Number(r.packages || 1), 0) ?? 0;
  const generatedOn    = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="space-y-4">

      {/* Controls */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Search Employee</p>

          {/* Employee search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Type name or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Official list */}
          {search && (
            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {filteredOfficials.length === 0 ? (
                <p className="text-center py-4 text-sm text-muted-foreground">No officials found</p>
              ) : filteredOfficials.map(o => (
                <button
                  key={o.id}
                  onClick={() => { setOfficialId(o.id); setSearch(''); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-0',
                    officialId === o.id && 'bg-red-50'
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-[#CC0000]/10 flex items-center justify-center text-xs font-bold text-[#CC0000] shrink-0">
                    {o.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{o.full_name}</p>
                    <p className="text-xs text-muted-foreground">{o.department ?? '—'}</p>
                  </div>
                  {officialId === o.id && <CheckCircle2 className="w-4 h-4 text-[#CC0000] ml-auto" />}
                </button>
              ))}
            </div>
          )}

          {/* Selected official pill */}
          {official && !search && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <UserCheck className="w-5 h-5 text-[#CC0000]" />
              <div className="flex-1">
                <p className="text-sm font-bold text-[#CC0000]">{official.full_name}</p>
                <p className="text-xs text-muted-foreground">{official.designation} · {official.department}</p>
              </div>
              <button onClick={() => setOfficialId('')} className="text-xs text-muted-foreground hover:text-destructive">Change</button>
            </div>
          )}

          {/* Date range */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <DateRangeBar from={from} to={to} onFrom={setFrom} onTo={setTo} onRefresh={refetch} loading={isLoading} />
          </div>
        </CardContent>
      </Card>

      {/* Print / Generate button */}
      {official && rows && rows.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handlePrint} className="gap-2" style={{ backgroundColor: '#CC0000' }}>
            <Printer className="w-4 h-4" />
            Print Acknowledgement
          </Button>
        </div>
      )}

      {/* ── Printable report ── */}
      {official && (
        <Card className="border-2">
          <CardContent className="p-0">
            {/* On-screen preview */}
            <div ref={printRef}>

              {/* Report Header */}
              <div className="header text-center border-b-4 p-6" style={{ borderColor: '#CC0000' }}>
                <h1 className="text-2xl font-bold tracking-widest uppercase" style={{ color: '#CC0000' }}>
                  Scorpion Express
                </h1>
                <h2 className="text-sm text-muted-foreground mt-1">Visitor Management System</h2>
                <h3 className="text-lg font-bold mt-3 uppercase tracking-wide">Courier Acknowledgement Report</h3>
              </div>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-6 py-4 bg-gray-50 border-b text-sm">
                {[
                  ['Employee Name', official.full_name],
                  ['Department',    official.department ?? '—'],
                  ['Designation',   official.designation ?? '—'],
                  ['Period',        `${from} to ${to}`],
                  ['Generated On',  generatedOn],
                  ['Total Records', String(rows?.length ?? 0)],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                    <span className="text-xs font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading…
                </div>
              ) : !rows?.length ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No records found for this period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr style={{ backgroundColor: '#CC0000' }}>
                        {['#', 'Date', 'Time', 'Courier Person', 'Mobile', 'Sender Name', 'Sender Address', 'Tracking #', 'Pkgs', 'Weight', 'Description'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-white text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 whitespace-nowrap font-medium">{r.date}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.time}</td>
                          <td className="px-3 py-2 font-semibold">{r.visitorName}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.mobile}</td>
                          <td className="px-3 py-2 font-semibold">{r.senderName}</td>
                          <td className="px-3 py-2 max-w-[120px]"><span className="line-clamp-2 text-muted-foreground text-xs">{r.senderAddress}</span></td>
                          <td className="px-3 py-2 font-mono text-xs text-purple-700">{r.tracking}</td>
                          <td className="px-3 py-2 text-center font-bold" style={{color:'#CC0000'}}>{r.packages}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.weight}</td>
                          <td className="px-3 py-2 max-w-[130px]"><span className="line-clamp-2">{r.description}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              {rows && rows.length > 0 && (
                <div className="summary grid grid-cols-2 gap-4 px-6 py-4 bg-gray-50 border-t border-b max-w-xs">
                  {[
                    { label: 'Total Receipts',  value: rows.length },
                    { label: 'Total Packages',  value: totalPackages },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-2xl font-bold" style={{ color: '#CC0000' }}>{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Signature footer */}
              <div className="px-6 py-5 border-t">
                <div className="flex items-end justify-between">
                  <div className="space-y-1 min-w-[220px]">
                    <p className="text-sm font-bold text-gray-800">{official.full_name}</p>
                    <p className="text-xs text-muted-foreground">{official.designation}{official.department ? ` · ${official.department}` : ''}</p>
                    <div className="h-10 border-b-2 border-gray-500 mt-4 w-52" />
                    <p className="text-xs text-gray-500 font-medium">Signature</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Date: ___________________</p>
                  </div>
                </div>
              </div>

              {/* Report footer */}
              <div className="text-center py-3 border-t text-xs text-muted-foreground bg-gray-50">
                This is a system-generated report from Scorpion Visitor Management System · Confidential
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {!official && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Search and select an employee above to generate their acknowledgement report</p>
          <p className="text-sm mt-1">The report can be printed and physically signed</p>
        </div>
      )}
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
        <TabsList className="mb-6 h-11 w-full sm:w-auto">
          <TabsTrigger value="visitors" className="gap-2 px-5">
            <Users className="w-4 h-4" />
            Visitor Report
          </TabsTrigger>
          <TabsTrigger value="couriers" className="gap-2 px-5">
            <Package className="w-4 h-4" />
            Courier Report
          </TabsTrigger>
          <TabsTrigger value="acknowledgement" className="gap-2 px-5">
            <FileText className="w-4 h-4" />
            Acknowledgement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visitors">
          <VisitorReport />
        </TabsContent>

        <TabsContent value="couriers">
          <CourierReport />
        </TabsContent>

        <TabsContent value="acknowledgement">
          <AcknowledgementReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
