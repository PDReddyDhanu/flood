'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Waves, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmail, sendPasswordReset, getUserData } from '@/lib/auth';
import { firebaseSignOut } from '@/lib/auth';

export default function CitizenLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmail(email, password);
      const userData = await getUserData(cred.user.uid);
      if (!userData || userData.role !== 'citizen') {
        await firebaseSignOut();
        setError('This account is not registered as a Citizen. Please use the correct portal.');
        setLoading(false);
        return;
      }
      toast({ title: 'Welcome back!', description: `Signed in as ${userData.name}.` });
      router.push('/citizen');
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email);
      toast({ title: 'Reset email sent!', description: 'Check your inbox for a password reset link.' });
      setForgotMode(false);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-primary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-primary p-3 rounded-2xl shadow-lg">
            <Waves className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-headline">FloodGuard Connect</h1>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Citizen Portal</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{forgotMode ? 'Reset Password' : 'Welcome Back'}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {forgotMode ? 'Enter your email to receive a reset link.' : 'Sign in to access your citizen dashboard.'}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9 h-11 rounded-xl"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Button>
              <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-sm text-primary font-semibold hover:underline">
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9 h-11 rounded-xl"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary font-semibold hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-9 pr-10 h-11 rounded-xl"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 mt-2" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          )}

          {!forgotMode && (
            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/citizen/register" className="text-primary font-bold hover:underline">
                Register here
              </Link>
            </p>
          )}
        </div>

        <p className="text-center mt-6 text-xs text-slate-400">
          <Link href="/" className="hover:text-primary">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email address.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/invalid-credential': return 'Invalid email or password.';
    default: return 'Something went wrong. Please try again.';
  }
}
