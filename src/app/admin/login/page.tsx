'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Waves, Mail, Lock, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmail, getUserData, ensureAdminDocument, firebaseSignOut } from '@/lib/auth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmail(email, password);

      // IMPORTANT: Create/verify the admin Firestore doc BEFORE reading it.
      // This avoids a race condition where onAuthStateChanged fetches
      // the doc before it exists on first login.
      await ensureAdminDocument(cred.user.uid, cred.user.email || email);

      // Now read back to verify role
      const userData = await getUserData(cred.user.uid);

      if (!userData || userData.role !== 'admin') {
        await firebaseSignOut();
        setError('Access denied. This is an admin-only portal.');
        setLoading(false);
        return;
      }

      toast({ title: 'Welcome, Admin.', description: 'Access to command center granted.' });

      // Use hard navigation (window.location) instead of router.push so that
      // the Firebase provider re-initialises and picks up the freshly created
      // Firestore admin doc cleanly, avoiding any stale null userData state.
      window.location.href = '/admin';
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-slate-700 border border-slate-600 p-3 rounded-2xl shadow-lg">
            <Waves className="h-8 w-8 text-slate-200" />
          </div>
          <h1 className="text-2xl font-bold text-white font-headline">FloodGuard Connect</h1>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
            <Shield className="h-3 w-3" />
            Admin Command Centre
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Restricted Access</h2>
            <p className="text-sm text-slate-400 mt-1">Authorised personnel only.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-800 rounded-xl text-sm text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  className="pl-9 h-11 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-slate-400"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-10 h-11 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-slate-400"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-bold bg-slate-600 hover:bg-slate-500 text-white mt-2"
              disabled={loading}
            >
              {loading ? 'Authenticating…' : 'Access Command Centre'}
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs text-slate-600">
          FloodGuard Connect — Restricted Zone
        </p>
      </div>
    </div>
  );
}

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found': return 'No admin account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/invalid-credential': return 'Invalid credentials.';
    default: return 'Authentication failed. Please try again.';
  }
}
