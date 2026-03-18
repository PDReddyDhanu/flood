'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Waves, Mail, Lock, User, Phone, MapPin, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { signUpCitizen } from '@/lib/auth';

export default function CitizenRegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      await signUpCitizen(form.email, form.password, form.name, form.phone, form.address);
      toast({ title: 'Account created!', description: 'You can now sign in to your citizen portal.' });
      router.push('/citizen/login');
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-primary p-3 rounded-2xl shadow-lg">
            <Waves className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-headline">FloodGuard Connect</h1>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Citizen Registration</span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create Citizen Account</h2>
            <p className="text-sm text-slate-500 mt-1">Register to request emergency help during flood events.</p>
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
              <Label htmlFor="address">Home Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="address" placeholder="Your city / district" className="pl-9 h-11 rounded-xl" value={form.address} onChange={set('address')} required />
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

            <Button type="submit" className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 mt-2" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/citizen/login" className="text-primary font-bold hover:underline">Sign in</Link>
          </p>
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
    case 'auth/email-already-in-use': return 'This email is already registered. Please sign in.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password is too weak. Use at least 6 characters.';
    default: return 'Registration failed. Please try again.';
  }
}
