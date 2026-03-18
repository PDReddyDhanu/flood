'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, Shield, UserPlus, CheckCircle, XCircle,
  Loader2, Search, Mail, Phone, Briefcase, MoreHorizontal,
  RefreshCw, Eye, EyeOff, UserCheck, UserX, Clock,
} from 'lucide-react';
import { Header } from '@/components/shared/Header';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import {
  getFirestore, collection, query, where, onSnapshot,
  doc, updateDoc, setDoc, deleteDoc,
} from 'firebase/firestore';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: 'citizen' | 'rescue';
  status: 'approved' | 'pending' | 'rejected';
  phone?: string;
  teamName?: string;
  address?: string;
  createdAt?: any;
}

const ROLE_STATUS_COLOR = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-orange-100 text-orange-700',
  rejected: 'bg-red-100 text-red-700',
};

function timeAgo(ts: any): string {
  if (!ts?.seconds) return 'N/A';
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Add User Dialog ────────────────────────────────────────────────────────────
function AddUserDialog({
  isOpen, onClose, defaultRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultRole: 'citizen' | 'rescue';
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: defaultRole,
    teamName: '',
    address: '',
    autoApprove: true,
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const db = getFirestore();

  useEffect(() => {
    setForm(f => ({ ...f, role: defaultRole }));
  }, [defaultRole]);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Name, email and password are required.' });
      return;
    }
    if (form.password.length < 6) {
      toast({ variant: 'destructive', title: 'Weak password', description: 'Password must be at least 6 characters.' });
      return;
    }
    setLoading(true);

    // Use a secondary Firebase app so the admin's session is NOT disturbed
    const secondaryAppName = `secondary-${Date.now()}`;
    let secondaryApp: any = null;
    try {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const newUid = cred.user.uid;

      // Update display name
      await updateProfile(cred.user, { displayName: form.name });

      // Create Firestore user doc
      const userData: Record<string, any> = {
        uid: newUid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        status: form.role === 'rescue' ? (form.autoApprove ? 'approved' : 'pending') : 'approved',
        createdAt: new Date(),
        createdByAdmin: true,
      };
      if (form.role === 'rescue') {
        userData.teamName = form.teamName.trim();
      } else {
        userData.address = form.address.trim();
      }
      await setDoc(doc(db, 'users', newUid), userData);

      toast({
        title: `✅ ${form.role === 'rescue' ? 'Rescue Member' : 'Citizen'} Created`,
        description: `${form.name} has been added${form.role === 'rescue' && form.autoApprove ? ' and approved' : ''}.`,
      });

      // Reset form and close
      setForm({ name: '', email: '', password: '', phone: '', role: defaultRole, teamName: '', address: '', autoApprove: true });
      onClose();
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This email is already registered.'
        : err.message;
      toast({ variant: 'destructive', title: 'Creation Failed', description: msg });
    } finally {
      setLoading(false);
      // Always clean up second app
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch {}
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-0 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-primary/10 rounded-xl">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-headline font-bold">Add New User</DialogTitle>
          </div>
          <DialogDescription>Create a user account manually without them self-registering.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as any }))}>
                <SelectTrigger className="h-10 rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">👤 Citizen</SelectItem>
                  <SelectItem value="rescue">🛡️ Rescue Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === 'rescue' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auto-Approve</Label>
                <Select value={form.autoApprove ? 'yes' : 'no'} onValueChange={v => setForm(f => ({ ...f, autoApprove: v === 'yes' }))}>
                  <SelectTrigger className="h-10 rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">✅ Approve now</SelectItem>
                    <SelectItem value="no">⏳ Pending review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-10 rounded-xl border-2" placeholder="Full Name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-10 rounded-xl border-2" placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-10 rounded-xl border-2" placeholder="+91 XXXXX" />
            </div>
          </div>

          {/* Role-specific */}
          {form.role === 'rescue' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Name</Label>
              <Input value={form.teamName} onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))} className="h-10 rounded-xl border-2" placeholder="e.g. Alpha Squad" />
            </div>
          )}
          {form.role === 'citizen' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="h-10 rounded-xl border-2" placeholder="Home address" />
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Temporary Password *</Label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="h-10 rounded-xl border-2 pr-10"
                placeholder="Min 6 characters"
              />
              <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-2.5 text-slate-400">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1 rounded-xl h-11" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button
              className="flex-1 h-11 rounded-xl font-bold gap-2"
              onClick={handleCreate}
              disabled={loading || !form.name || !form.email || !form.password}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Creating…' : 'Create User'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const router = useRouter();
  const { userData } = useUser();
  const { toast } = useToast();
  const db = getFirestore();

  const [citizens, setCitizens] = useState<AppUser[]>([]);
  const [rescuers, setRescuers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addRole, setAddRole] = useState<'citizen' | 'rescue'>('citizen');

  // Live citizens
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'citizen'));
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => d.data() as AppUser);
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setCitizens(docs);
    });
  }, [db]);

  // Live rescue
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'rescue'));
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => d.data() as AppUser);
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setRescuers(docs);
    });
  }, [db]);

  const handleApprove = async (uid: string) => {
    setActionLoading(uid + '_approve');
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'approved' });
      toast({ title: '✅ Approved', description: 'Rescue team member is now active.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally { setActionLoading(null); }
  };

  const handleReject = async (uid: string) => {
    setActionLoading(uid + '_reject');
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'rejected' });
      toast({ title: 'Rejected', description: 'Rescue team member access revoked.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally { setActionLoading(null); }
  };

  const filterUsers = (users: AppUser[]) => {
    return users.filter(u => {
      const matchSearch = !search.trim() ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search);
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchSearch && matchStatus;
    });
  };

  const openAddDialog = (role: 'citizen' | 'rescue') => {
    setAddRole(role);
    setAddDialogOpen(true);
  };

  const filteredCitizens = filterUsers(citizens);
  const filteredRescuers = filterUsers(rescuers);

  const UserTable = ({
    users,
    isRescue,
  }: {
    users: AppUser[];
    isRescue: boolean;
  }) => (
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>{isRescue ? 'Team' : 'Phone'}</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          {isRescue && <TableHead className="text-center">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 && (
          <TableRow>
            <TableCell colSpan={isRescue ? 6 : 5} className="text-center text-slate-400 py-10">
              No users found.
            </TableCell>
          </TableRow>
        )}
        {users.map(u => (
          <TableRow key={u.uid} className="hover:bg-slate-50">
            <TableCell>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-black text-slate-500 shrink-0">
                  {(u.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                  {isRescue && u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
            <TableCell className="text-slate-600 text-sm">
              {isRescue ? (u.teamName || '—') : (u.phone || '—')}
            </TableCell>
            <TableCell>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_STATUS_COLOR[u.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {u.status === 'approved' && <UserCheck className="h-3 w-3" />}
                {u.status === 'pending' && <Clock className="h-3 w-3" />}
                {u.status === 'rejected' && <UserX className="h-3 w-3" />}
                {u.status?.charAt(0).toUpperCase() + u.status?.slice(1)}
              </span>
            </TableCell>
            <TableCell className="text-slate-400 text-xs">{timeAgo(u.createdAt)}</TableCell>
            {isRescue && (
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {u.status !== 'approved' && (
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-green-600 hover:bg-green-700 gap-1"
                      disabled={actionLoading === u.uid + '_approve'}
                      onClick={() => handleApprove(u.uid)}
                    >
                      {actionLoading === u.uid + '_approve' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Approve
                    </Button>
                  )}
                  {u.status !== 'rejected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                      disabled={actionLoading === u.uid + '_reject'}
                      onClick={() => handleReject(u.uid)}
                    >
                      {actionLoading === u.uid + '_reject' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                      Revoke
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <AuthGuard role="admin">
      <div className="min-h-screen bg-slate-50">
        <Header role="admin" userName={userData?.name || 'Admin'} />

        <main className="container max-w-7xl mx-auto px-4 py-8">
          {/* Back + Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-primary mb-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold font-headline text-slate-900">User Management</h1>
              <p className="text-slate-500 text-sm mt-1">Manage citizens and rescue team members. Approve or add users manually.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center"><Users className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-xs text-slate-400 font-bold uppercase">Citizens</p><p className="text-2xl font-black text-slate-800">{citizens.length}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center"><Shield className="h-5 w-5 text-accent" /></div>
              <div><p className="text-xs text-slate-400 font-bold uppercase">Rescue</p><p className="text-2xl font-black text-slate-800">{rescuers.length}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center"><Clock className="h-5 w-5 text-orange-500" /></div>
              <div><p className="text-xs text-slate-400 font-bold uppercase">Pending</p><p className="text-2xl font-black text-slate-800">{rescuers.filter(r => r.status === 'pending').length}</p></div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-slate-400 font-bold uppercase">Approved</p><p className="text-2xl font-black text-slate-800">{rescuers.filter(r => r.status === 'approved').length}</p></div>
            </div>
          </div>

          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, phone..."
                className="pl-9 h-10 rounded-xl border-2"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
              <SelectTrigger className="h-10 w-40 rounded-xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="citizens" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="h-12 bg-white border-2 p-1.5 rounded-2xl shadow-sm">
                <TabsTrigger value="citizens" className="rounded-xl font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white px-5 gap-2">
                  <Users className="h-4 w-4" /> Citizens ({filteredCitizens.length})
                </TabsTrigger>
                <TabsTrigger value="rescue" className="rounded-xl font-bold data-[state=active]:bg-accent data-[state=active]:text-white px-5 gap-2">
                  <Shield className="h-4 w-4" /> Rescue Teams ({filteredRescuers.length})
                  {rescuers.filter(r => r.status === 'pending').length > 0 && (
                    <span className="ml-1 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {rescuers.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Citizens Tab */}
            <TabsContent value="citizens">
              <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-headline">Citizens</CardTitle>
                    <CardDescription>All registered citizens in the system.</CardDescription>
                  </div>
                  <Button
                    className="gap-2 rounded-xl font-bold"
                    onClick={() => openAddDialog('citizen')}
                  >
                    <UserPlus className="h-4 w-4" /> Add Citizen
                  </Button>
                </CardHeader>
                <UserTable users={filteredCitizens} isRescue={false} />
              </Card>
            </TabsContent>

            {/* Rescue Tab */}
            <TabsContent value="rescue">
              <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-headline">Rescue Team Members</CardTitle>
                    <CardDescription>Approve pending members or add new ones manually.</CardDescription>
                  </div>
                  <Button
                    className="gap-2 rounded-xl font-bold bg-accent hover:bg-accent/90"
                    onClick={() => openAddDialog('rescue')}
                  >
                    <UserPlus className="h-4 w-4" /> Add Member
                  </Button>
                </CardHeader>
                <UserTable users={filteredRescuers} isRescue={true} />
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AddUserDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        defaultRole={addRole}
      />
    </AuthGuard>
  );
}
