
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Waves, Bell, Menu, LogOut, Settings, Home, Ambulance, Shield, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Show, UserButton, SignInButton, SignUpButton, useClerk } from '@clerk/nextjs';

interface HeaderProps {
  role: 'citizen' | 'rescue' | 'admin';
  userName: string;
}

export function Header({ role, userName }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { signOut } = useClerk();

  const roleColors = {
    citizen: 'bg-primary',
    rescue: 'bg-accent',
    admin: 'bg-slate-800',
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirectUrl: '/' });
      toast({
        title: "Logged Out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "Could not sign out. Please try again.",
      });
    }
  };

  const handleNotifications = () => {
    toast({
      title: "Notifications",
      description: "No new notifications at this time.",
    });
  };

  const navLinks = [
    { href: '/citizen', label: 'Citizen Portal', icon: <UserIcon className="h-5 w-5" /> },
    { href: '/rescue', label: 'Rescue Dashboard', icon: <Ambulance className="h-5 w-5" /> },
    { href: '/admin', label: 'Admin Command', icon: <Shield className="h-5 w-5" /> },
  ];

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

          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="relative text-slate-600 hover:text-primary" onClick={handleNotifications}>
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
            </Button>
            
            {/* Clerk Auth: Show UserButton when signed in, SignIn/SignUp when signed out */}
            <Show when="signed-in">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-10 w-10 border-2 border-slate-100",
                  }
                }}
              />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="outline" size="sm" className="rounded-xl font-bold border-2">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-white">
                  Sign Up
                </Button>
              </SignUpButton>
            </Show>
            
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[300px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-left">
              <Waves className="h-5 w-5 text-primary" />
              FloodGuard Connect
            </SheetTitle>
            <SheetDescription className="text-left">Navigate to a portal</SheetDescription>
          </SheetHeader>
          <nav className="mt-8 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  `/${role}` === link.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            <div className="border-t my-4" />
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Home className="h-5 w-5" />
              Back to Home
            </Link>
            <Show when="signed-in">
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 text-left"
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </Show>
            <Show when="signed-out">
              <div className="flex flex-col gap-2 px-4">
                <SignInButton mode="modal">
                  <Button variant="outline" className="w-full rounded-xl font-bold border-2">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="w-full rounded-xl font-bold bg-primary hover:bg-primary/90 text-white">
                    Sign Up
                  </Button>
                </SignUpButton>
              </div>
            </Show>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
