'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Phone, MapPin, Shield, Briefcase, Loader2, KeyRound } from 'lucide-react';
import { Header } from '@/components/shared/Header';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/provider';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = (searchParams.get('role') as 'citizen' | 'rescue' | 'admin') || 'citizen';
  const { userData, user } = useUser();
  const { toast } = useToast();
  const db = getFirestore();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    teamName: '',
    vehicleType: '',
    teamSize: '',
  });
  const [saving, setSaving] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  // Prefill
  useEffect(() => {
    if (userData) {
      setForm({
        name: userData.name || '',
        phone: userData.phone || '',
        address: userData.address || '',
        teamName: userData.teamName || '',
        vehicleType: userData.vehicleType || '',
        teamSize: userData.teamSize?.toString() || '',
      });
    }
  }, [userData]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const update: Record<string, any> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
      };
      if (role === 'citizen') update.address = form.address.trim();
      if (role === 'rescue') {
        update.teamName = form.teamName.trim();
        update.vehicleType = form.vehicleType.trim();
        update.teamSize = parseInt(form.teamSize) || 0;
      }
      await updateDoc(doc(db, 'users', user.uid), update);
      toast({ title: 'Profile Updated ✅', description: 'Your information has been saved.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user || !user.email) return;
    if (pwForm.newPw !== pwForm.confirm) {
      toast({ variant: 'destructive', title: 'Mismatch', description: 'New passwords do not match.' });
      return;
    }
    if (pwForm.newPw.length < 6) {
      toast({ variant: 'destructive', title: 'Too Short', description: 'Password must be at least 6 characters.' });
      return;
    }
    setPwSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, pwForm.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, pwForm.newPw);
      setPwForm({ current: '', newPw: '', confirm: '' });
      toast({ title: 'Password Changed ✅', description: 'Your password has been updated.' });
    } catch (err: any) {
      const msg = err.code === 'auth/wrong-password'
        ? 'Current password is incorrect.'
        : err.message;
      toast({ variant: 'destructive', title: 'Failed', description: msg });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <AuthGuard role={role}>
      <div className="min-h-screen bg-slate-50">
        <Header role={role} userName={userData?.name || 'User'} />
        <main className="container max-w-3xl mx-auto px-4 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>

          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary to-blue-600 text-white p-8">
                <div className="flex items-center gap-5">
                  <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-black text-white border-4 border-white/30">
                    {(form.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-white font-headline">{form.name || 'Your Name'}</CardTitle>
                    <CardDescription className="text-blue-100 font-medium mt-1 flex items-center gap-1.5">
                      {role === 'citizen' && <><User className="h-3.5 w-3.5" /> Citizen</>}
                      {role === 'rescue' && <><Shield className="h-3.5 w-3.5" /> Rescue Team</>}
                      {role === 'admin' && <><Briefcase className="h-3.5 w-3.5" /> Administrator</>}
                    </CardDescription>
                    <p className="text-blue-200 text-xs mt-1">{user?.email}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 space-y-6">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider border-b pb-3">Basic Information</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Full Name
                    </Label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="h-11 rounded-xl border-2"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Phone Number
                    </Label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="h-11 rounded-xl border-2"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>

                  {role === 'citizen' && (
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Home Address
                      </Label>
                      <Input
                        value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        className="h-11 rounded-xl border-2"
                        placeholder="Your home address"
                      />
                    </div>
                  )}

                  {role === 'rescue' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Name</Label>
                        <Input
                          value={form.teamName}
                          onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))}
                          className="h-11 rounded-xl border-2"
                          placeholder="e.g. Alpha Squad"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle / Equipment</Label>
                        <Input
                          value={form.vehicleType}
                          onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                          className="h-11 rounded-xl border-2"
                          placeholder="e.g. Boat + Life vests"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Size</Label>
                        <Input
                          type="number"
                          value={form.teamSize}
                          onChange={e => setForm(f => ({ ...f, teamSize: e.target.value }))}
                          className="h-11 rounded-xl border-2"
                          placeholder="Number of members"
                          min={1}
                        />
                      </div>
                    </>
                  )}
                </div>

                <Button
                  className="w-full h-12 rounded-xl font-bold text-base gap-2"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  {saving ? 'Saving…' : 'Save Profile'}
                </Button>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="border-0 shadow-md rounded-3xl">
              <CardHeader className="px-8 pt-8 pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-orange-500" /> Change Password
                </CardTitle>
                <CardDescription>Requires your current password for verification.</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Password</Label>
                    <Input
                      type="password"
                      value={pwForm.current}
                      onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                      className="h-11 rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</Label>
                    <Input
                      type="password"
                      value={pwForm.newPw}
                      onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                      className="h-11 rounded-xl border-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New</Label>
                    <Input
                      type="password"
                      value={pwForm.confirm}
                      onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                      className="h-11 rounded-xl border-2"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl font-bold border-2 border-orange-200 text-orange-600 hover:bg-orange-50 gap-2"
                  onClick={handlePasswordChange}
                  disabled={pwSaving || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
                >
                  {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {pwSaving ? 'Updating…' : 'Update Password'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}
