import React from 'react';
import { Camera, Loader2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useFaceEntryLogs } from '@/hooks/useFaceRecognition';
import { cn, formatDate, formatDateTime, formatTime, getInitials } from '@/lib/utils';

export default function FaceEntryLogsPage() {
  const [search, setSearch] = React.useState('');
  const { data: logs, isLoading, refetch } = useFaceEntryLogs();

  const filtered = React.useMemo(() => {
    const rows = logs ?? [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((log) =>
      log.visitor?.full_name.toLowerCase().includes(q) ||
      log.visitor?.phone.toLowerCase().includes(q) ||
      (log.visitor?.email ?? '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayCount = (logs ?? []).filter((log) =>
    new Date(log.entry_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === today
  ).length;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Face Entry Logs</h1>
          <p className="text-sm text-muted-foreground">Track successful face-recognition entries with exact date and time.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="gap-2">
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{logs?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Auto Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{todayCount}</p>
            <p className="text-xs text-muted-foreground">Logged Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Shown in List</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Successful Face Entries
              </CardTitle>
              <CardDescription>Each row is created immediately after a returning visitor is matched.</CardDescription>
            </div>
            <div className="relative sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, email..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading face entry logs...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{logs?.length ? 'No logs match your search' : 'No face entries logged yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Visitor', 'Phone', 'Email', 'Entry Date', 'Entry Time', 'Match', 'Snapshot'].map((header) => (
                      <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={log.visitor?.photo_data_url ?? undefined} />
                            <AvatarFallback className="text-xs">{getInitials(log.visitor?.full_name ?? '?')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-semibold">{log.visitor?.full_name ?? 'Unknown visitor'}</p>
                            <p className="text-[11px] text-muted-foreground">{formatDateTime(log.entry_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{log.visitor?.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-xs">{log.visitor?.email ?? '—'}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDate(log.entry_at)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTime(log.entry_at)}</td>
                      <td className="px-4 py-3 text-xs">
                        {log.match_distance !== null ? <Badge variant="success">{Number(log.match_distance).toFixed(3)}</Badge> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.snapshot_data_url ? (
                          <img src={log.snapshot_data_url} alt="Entry snapshot" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
