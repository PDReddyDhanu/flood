'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { Waves } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  role: 'citizen' | 'rescue' | 'admin';
}

const loginPaths: Record<string, string> = {
  citizen: '/citizen/login',
  rescue: '/rescue/login',
  admin: '/admin/login',
};

export function AuthGuard({ children, role }: AuthGuardProps) {
  const { user, userData, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything while Firebase + Firestore are still resolving
    if (isUserLoading) return;

    // Not signed in at all
    if (!user) {
      router.replace(loginPaths[role]);
      return;
    }

    // Signed in but no Firestore doc (shouldn't happen in normal flow, but guard it)
    if (!userData) {
      router.replace(loginPaths[role]);
      return;
    }

    // Wrong role — user went to wrong portal
    if (userData.role !== role) {
      router.replace(loginPaths[role]);
      return;
    }

    // Rescue-specific: must be approved
    if (role === 'rescue' && userData.status === 'pending') {
      router.replace('/rescue/login?status=pending');
      return;
    }
    if (role === 'rescue' && userData.status === 'rejected') {
      router.replace('/rescue/login?status=rejected');
      return;
    }
  }, [isUserLoading, user, userData, role, router]);

  // Show full-screen loader while Firebase resolves (auth + Firestore)
  if (isUserLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-primary p-4 rounded-2xl shadow-lg animate-pulse">
            <Waves className="h-10 w-10 text-white" />
          </div>
          <p className="text-slate-500 font-medium text-sm">Verifying access…</p>
        </div>
      </div>
    );
  }

  // Not authorised — render nothing while redirect fires
  if (!user || !userData || userData.role !== role) return null;
  if (role === 'rescue' && userData.status !== 'approved') return null;

  return <>{children}</>;
}
