'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Waves, Menu, LogOut, Home, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/provider';
import { firebaseSignOut } from '@/lib/auth';
import { NotificationBell } from '@/components/shared/NotificationBell';

interface HeaderProps {
  role: 'citizen' | 'rescue' | 'admin';
  userName: string;
}

export function Header({ role, userName }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const roleColors = {
    citizen: 'bg-primary',
    rescue: 'bg-accent',
    admin: 'bg-slate-800',
  };

  const loginPaths: Record<string, string> = {
    citizen: '/citizen/login',
    rescue: '/rescue/login',
    admin: '/admin/login',
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut();
      toast({ title: 'Logged Out', description: 'You have been signed out successfully.' });
      router.push(loginPaths[role]);
    } catch {
      toast({ variant: 'destructive', title: 'Logout Failed', description: 'Could not sign out. Please try again.' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className={`p-1.5 rounded-lg ${roleColors[role]} transition-transform group-hover:scale-110`}>
                <Waves className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:inline font-headline">
                FloodGuard<span className="text-primary">Connect</span>
              </span>
            </Link>
            <div className="hidden md:flex ml-6 h-10 items-center px-3 rounded-full bg-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {role} Portal
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live notification bell */}
            <NotificationBell role={role} />

            {user && (
              <div className="hidden sm:flex items-center gap-3">
                {/* Profile link */}
                <Link
                  href={`/profile?role=${role}`}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-primary transition-colors"
                >
                  <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="hidden md:inline">{userName}</span>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold border-2 gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[300px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-left">
              <Waves className="h-5 w-5 text-primary" /> FloodGuard Connect
            </SheetTitle>
            <SheetDescription className="text-left">Navigation</SheetDescription>
          </SheetHeader>
          <nav className="mt-8 flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Home className="h-5 w-5" /> Back to Home
            </Link>
            <Link
              href={`/profile?role=${role}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              <User className="h-5 w-5" /> My Profile
            </Link>
            <div className="border-t my-4" />
            {user && (
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 text-left"
              >
                <LogOut className="h-5 w-5" /> Log out
              </button>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
