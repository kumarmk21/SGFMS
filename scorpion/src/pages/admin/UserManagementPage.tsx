import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users, Plus, ArrowLeft, Search, Loader2, UserCheck,
  Building, Phone, Mail, Shield, Edit, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllProfiles, useToggleAvailability, useUpdateProfile } from '@/hooks/useProfiles';
import type { Profile } from '@/types';
import { cn, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: profiles, isLoading, refetch } = useAllProfiles();
  const toggleAvailability = useToggleAvailability();
  const updateProfile = useUpdateProfile();

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

  const onCreateSubmit = async (data: CreateUserForm) => {
    setCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: data.role,
          }
        }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: data.full_name,
        role: data.role,
        department: data.department || null,
        contact_number: data.contact_number || null,
        email: data.email,
        designation: data.designation || null,
        is_available: true,
      });
      if (profileError) throw profileError;

      toast.success(`User ${data.full_name} created successfully`);
      reset();
      setShowCreate(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
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
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(['admin', 'receptionist', 'official'] as const).map(role => (
          <div key={role} className="bg-white rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{profiles?.filter(p => p.role === role).length ?? 0}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}s</p>
          </div>
        ))}
      </div>

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
                    <AvatarFallback className={cn('text-sm font-semibold', roleColors[user.role]?.replace('text-', 'text-').split(' ')[0])}>
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

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new account for a team member</DialogDescription>
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
                <Select onValueChange={(v) => setValue('role', v as any)} defaultValue="official">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

      {/* Edit User Dialog */}
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
      department: values.department || null,
      designation: values.designation || null,
      contact_number: values.contact_number || null,
    } as any);
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
