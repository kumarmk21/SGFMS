import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users, Plus, ArrowLeft, Search, Loader2, Building, Phone,
  Mail, Edit, Check, Download, Upload, AlertCircle,
  CheckCircle2, XCircle, FileSpreadsheet, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAllProfiles, useToggleAvailability, useUpdateProfile } from '@/hooks/useProfiles';
import type { Profile } from '@/types';
import { cn, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

const VALID_ROLES = ['official', 'receptionist', 'admin'] as const;

interface BulkUserRow {
  row: number;
  full_name: string;
  email: string;
  password: string;
  role: string;
  department: string;
  designation: string;
  contact_number: string;
  errors: string[];
}

interface BulkResult {
  email: string;
  status: 'created' | 'error';
  error?: string;
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'full_name', 'email', 'password', 'role',
  'department', 'designation', 'contact_number',
];

const TEMPLATE_SAMPLE_ROWS = [
  ['Rahul Sharma',  'rahul.sharma@scorpion.com',  'Password@123', 'official',    'Finance',    'General Manager',    '+91 9876543210'],
  ['Sarah Khan',    'sarah.khan@scorpion.com',    'Password@123', 'receptionist','Front Desk', 'Senior Receptionist', '+91 9876543211'],
  ['Priya Nair',    'priya.nair2@scorpion.com',   'Password@123', 'official',    'HR',         'HR Manager',          '+91 9876543212'],
];

function downloadTemplate() {
  const instructionRows = [
    ['# SCORPION VMS — Bulk User Upload Template'],
    ['# Instructions:'],
    ['#   1. Do NOT modify the header row (row 5).'],
    ['#   2. role must be one of: official | receptionist | admin'],
    ['#   3. password must be at least 8 characters.'],
    ['#   4. Rows starting with # are ignored.'],
    ['#   5. department, designation, contact_number are optional.'],
    [],
  ];

  const rows = [
    ...instructionRows,
    TEMPLATE_HEADERS,
    ...TEMPLATE_SAMPLE_ROWS,
  ];

  const csv = rows
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scorpion_vms_user_upload_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  return lines
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(line => {
      const cells: string[] = [];
      let inQuote = false;
      let cell = '';
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
          else { inQuote = !inQuote; }
        } else if (ch === ',' && !inQuote) {
          cells.push(cell.trim());
          cell = '';
        } else {
          cell += ch;
        }
      }
      cells.push(cell.trim());
      return cells;
    });
}

function validateRows(rows: string[][]): BulkUserRow[] {
  const headerIdx = rows.findIndex(r =>
    r[0]?.toLowerCase() === 'full_name' && r[1]?.toLowerCase() === 'email'
  );
  const dataRows = headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows;

  return dataRows
    .filter(r => r.some(c => c))
    .map((r, i) => {
      const [full_name = '', email = '', password = '', role = '',
             department = '', designation = '', contact_number = ''] = r;
      const errors: string[] = [];
      if (!full_name) errors.push('full_name required');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('valid email required');
      if (!password || password.length < 8) errors.push('password min 8 chars');
      if (!VALID_ROLES.includes(role as never)) errors.push(`role must be: ${VALID_ROLES.join(' | ')}`);
      return { row: headerIdx >= 0 ? headerIdx + i + 2 : i + 1, full_name, email, password, role, department, designation, contact_number, errors };
    });
}

// ─── Form schema ─────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Minimum 8 characters'),
  role: z.enum(['receptionist', 'official', 'admin']),
  department: z.string().optional(),
  contact_number: z.string().optional(),
  designation: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  receptionist: 'bg-blue-100 text-blue-800',
  official: 'bg-green-100 text-green-800',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);

  // Bulk upload state
  const [bulkRows, setBulkRows] = useState<BulkUserRow[] | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [showBulk, setShowBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profiles, isLoading, refetch } = useAllProfiles();
  const toggleAvailability = useToggleAvailability();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'official' },
  });

  const filtered = profiles?.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.full_name.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q) ||
      p.role.includes(q);
  }) ?? [];

  // ── Single user creation ──────────────────────────────────────────────────

  const onCreateSubmit = async (data: CreateUserForm) => {
    setCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          users: [{
            full_name: data.full_name,
            email: data.email,
            password: data.password,
            role: data.role,
            department: data.department,
            designation: data.designation,
            contact_number: data.contact_number,
          }],
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Failed');
      if (result.failed > 0) throw new Error(result.results[0]?.error ?? 'Creation failed');

      toast.success(`${data.full_name} created successfully`);
      reset();
      setShowCreate(false);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  // ── File upload / parse ───────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      const validated = validateRows(parsed);
      setBulkRows(validated);
      setBulkResults(null);
      setBulkProgress(0);
      setShowBulk(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Bulk create ───────────────────────────────────────────────────────────

  const handleBulkCreate = async () => {
    if (!bulkRows) return;
    const validRows = bulkRows.filter(r => r.errors.length === 0);
    if (!validRows.length) { toast.error('No valid rows to upload'); return; }

    setBulkUploading(true);
    setBulkProgress(0);
    setBulkResults(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Process in batches of 10
      const BATCH = 10;
      const allResults: BulkResult[] = [];

      for (let i = 0; i < validRows.length; i += BATCH) {
        const batch = validRows.slice(i, i + BATCH);
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ users: batch }),
        });
        const data = await res.json();
        allResults.push(...(data.results ?? []));
        setBulkProgress(Math.round(((i + batch.length) / validRows.length) * 100));
      }

      setBulkResults(allResults);
      const created = allResults.filter(r => r.status === 'created').length;
      const failed  = allResults.filter(r => r.status === 'error').length;
      if (failed === 0) toast.success(`${created} user${created !== 1 ? 's' : ''} created successfully`);
      else toast.warning(`${created} created, ${failed} failed — check results`);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bulk upload failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const invalidCount = bulkRows?.filter(r => r.errors.length > 0).length ?? 0;
  const validCount   = bulkRows?.filter(r => r.errors.length === 0).length ?? 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">{profiles?.length ?? 0} users in the system</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download Template</span>
            <span className="sm:hidden">Template</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload File</span>
            <span className="sm:hidden">Upload</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Bulk upload hint banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2.5 text-xs text-blue-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          To create users in bulk: click <strong>Download Template</strong> → fill in the CSV → click <strong>Upload File</strong>.
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(['admin', 'receptionist', 'official'] as const).map(role => (
          <div key={role} className="bg-white rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{profiles?.filter(p => p.role === role).length ?? 0}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}s</p>
          </div>
        ))}
      </div>

      {/* User list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((user) => (
                <div key={user.id} className="flex items-center gap-4 px-4 lg:px-6 py-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className={cn('text-sm font-semibold', roleColors[user.role])}>
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{user.full_name}</p>
                      <Badge className={cn('text-xs', roleColors[user.role])} variant="outline">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {user.email && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Mail className="w-3 h-3" />{user.email}</span>}
                      {user.department && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Building className="w-3 h-3" />{user.department}</span>}
                      {user.contact_number && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Phone className="w-3 h-3" />{user.contact_number}</span>}
                    </div>
                    {user.designation && <p className="text-xs text-muted-foreground mt-0.5">{user.designation}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {user.role === 'official' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {user.is_available ? 'Available' : 'Away'}
                        </span>
                        <Switch
                          checked={user.is_available}
                          onCheckedChange={(v) => toggleAvailability.mutate({ id: user.id, isAvailable: v })}
                          className="scale-90"
                        />
                      </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditUser(user)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add User dialog ── */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a single account for a team member</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input placeholder="John Doe" {...register('full_name')} className={errors.full_name ? 'border-destructive' : ''} />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" placeholder="john@scorpion.com" {...register('email')} className={errors.email ? 'border-destructive' : ''} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input type="password" placeholder="Min. 8 characters" {...register('password')} className={errors.password ? 'border-destructive' : ''} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select onValueChange={(v) => setValue('role', v as never)} defaultValue="official">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="official">Company Official</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input placeholder="e.g., Finance" {...register('department')} />
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input placeholder="e.g., Manager" {...register('designation')} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Number</Label>
                <Input type="tel" placeholder="+91 9876543210" {...register('contact_number')} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset(); }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="flex-1 gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Upload dialog ── */}
      <Dialog open={showBulk} onOpenChange={(o) => {
        if (!bulkUploading) { setShowBulk(o); if (!o) { setBulkRows(null); setBulkResults(null); } }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Bulk User Upload
            </DialogTitle>
            <DialogDescription>
              Review the parsed rows, then click <strong>Create Users</strong> to process all valid entries.
            </DialogDescription>
          </DialogHeader>

          {/* Summary badges */}
          {bulkRows && !bulkResults && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {validCount} valid
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                  <XCircle className="w-3.5 h-3.5" />
                  {invalidCount} invalid (will be skipped)
                </div>
              )}
            </div>
          )}

          {/* Progress bar */}
          {bulkUploading && (
            <div className="space-y-1.5 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Creating users…</span>
                <span>{bulkProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${bulkProgress}%`, backgroundColor: '#CC0000' }}
                />
              </div>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-8">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Full Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Email</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Role</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Department</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(bulkRows ?? []).map((r) => {
                  const result = bulkResults?.find(res => res.email.toLowerCase() === r.email.toLowerCase());
                  return (
                    <tr
                      key={r.row}
                      className={cn(
                        'hover:bg-gray-50',
                        r.errors.length > 0 ? 'bg-red-50/50' : '',
                        result?.status === 'created' ? 'bg-green-50/50' : '',
                        result?.status === 'error'   ? 'bg-red-50/50'   : '',
                      )}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                      <td className="px-3 py-2 font-medium">{r.full_name || <span className="text-muted-foreground italic">—</span>}</td>
                      <td className="px-3 py-2">{r.email || <span className="text-muted-foreground italic">—</span>}</td>
                      <td className="px-3 py-2">
                        {r.role && VALID_ROLES.includes(r.role as never) ? (
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', roleColors[r.role])}>
                            {r.role}
                          </span>
                        ) : (
                          <span className="text-red-600">{r.role || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.department || '—'}</td>
                      <td className="px-3 py-2">
                        {result ? (
                          result.status === 'created' ? (
                            <span className="flex items-center gap-1 text-green-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Created
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600" title={result.error}>
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[140px]">{result.error}</span>
                            </span>
                          )
                        ) : r.errors.length > 0 ? (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[140px]">{r.errors.join('; ')}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Ready</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkUploading}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Different File
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowBulk(false); setBulkRows(null); setBulkResults(null); }}
                disabled={bulkUploading}
              >
                {bulkResults ? 'Close' : 'Cancel'}
              </Button>
              {!bulkResults && (
                <Button
                  size="sm"
                  onClick={handleBulkCreate}
                  disabled={bulkUploading || validCount === 0}
                  className="gap-2 min-w-[130px]"
                >
                  {bulkUploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Create {validCount} User{validCount !== 1 ? 's' : ''}</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit User dialog ── */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update {editUser.full_name}'s profile</DialogDescription>
            </DialogHeader>
            <EditUserForm user={editUser} onClose={() => { setEditUser(null); refetch(); }} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Edit form (unchanged logic, kept separate) ───────────────────────────────

function EditUserForm({ user, onClose }: { user: Profile; onClose: () => void }) {
  const updateProfile = useUpdateProfile();
  const [values, setValues] = useState({
    full_name: user.full_name,
    department: user.department ?? '',
    designation: user.designation ?? '',
    contact_number: user.contact_number ?? '',
  });

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      id: user.id,
      ...values,
      department:      values.department      || null,
      designation:     values.designation     || null,
      contact_number:  values.contact_number  || null,
    } as never);
    onClose();
  };

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1.5">
        <Label>Full Name</Label>
        <Input value={values.full_name} onChange={e => setValues(v => ({ ...v, full_name: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Department</Label>
        <Input value={values.department} onChange={e => setValues(v => ({ ...v, department: e.target.value }))} placeholder="e.g., Finance" />
      </div>
      <div className="space-y-1.5">
        <Label>Designation</Label>
        <Input value={values.designation} onChange={e => setValues(v => ({ ...v, designation: e.target.value }))} placeholder="e.g., Manager" />
      </div>
      <div className="space-y-1.5">
        <Label>Contact Number</Label>
        <Input value={values.contact_number} onChange={e => setValues(v => ({ ...v, contact_number: e.target.value }))} placeholder="+91 9876543210" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={updateProfile.isPending} className="flex-1 gap-2">
          {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
