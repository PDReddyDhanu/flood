'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Waves, Mail, Lock, User, Phone, Briefcase, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { signUpRescue } from '@/lib/auth';

export default function RescueRegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', teamName: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUpRescue(form.email, form.password, form.name, form.phone, form.teamName);
      setSuccess(true);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-slate-50 to-accent/5 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Registration Submitted!</h2>
              <p className="text-slate-500 mt-3 text-sm leading-relaxed">
                Your rescue team account has been submitted for review. An admin will approve your account shortly. You will be able to log in once approved.
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-orange-700 font-medium">
              ⏳ Status: Pending Admin Approval
            </div>
            <Button className="w-full h-11 rounded-xl font-bold bg-accent hover:bg-accent/90" onClick={() => router.push('/rescue/login')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-slate-50 to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-accent p-3 rounded-2xl shadow-lg">
            <Waves className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-headline">FloodGuard Connect</h1>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Rescue Team Registration</span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Join the Rescue Network</h2>
            <p className="text-sm text-slate-500 mt-1">Registration requires admin approval before you can log in.</p>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700 font-medium flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            Your account will be reviewed by an admin before activation.
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="name" placeholder="Your full name" className="pl-9 h-11 rounded-xl" value={form.name} onChange={set('name')} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="email" type="email" placeholder="you@example.com" className="pl-9 h-11 rounded-xl" value={form.email} onChange={set('email')} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="phone" type="tel" placeholder="+91 XXXXXXXXXX" className="pl-9 h-11 rounded-xl" value={form.phone} onChange={set('phone')} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teamName">Team / Organization Name</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="teamName" placeholder="e.g. NDRF Team Alpha" className="pl-9 h-11 rounded-xl" value={form.teamName} onChange={set('teamName')} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" className="pl-9 pr-10 h-11 rounded-xl" value={form.password} onChange={set('password')} required />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" className="pl-9 h-11 rounded-xl" value={form.confirmPassword} onChange={set('confirmPassword')} required />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl font-bold bg-accent hover:bg-accent/90 mt-2" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit Registration'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/rescue/login" className="text-accent font-bold hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-slate-400">
          <Link href="/" className="hover:text-accent">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return 'This email is already registered.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password is too weak. Use at least 6 characters.';
    default: return 'Registration failed. Please try again.';
  }
}
