'use client';

import React from 'react';
import Link from 'next/link';
import { User, Ambulance, Lock, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary p-4 rounded-2xl shadow-lg">
              <Waves className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 font-headline">FloodGuard Connect</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Real-time emergency coordination for flood disasters. Saving lives through smart technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
          <Link href="/citizen/login" className="transition-transform hover:scale-105">
            <Card className="h-full border-2 border-transparent hover:border-primary/20 shadow-md">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-headline">Citizen Portal</CardTitle>
                <CardDescription>Request immediate help, track rescue status, and stay safe.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-primary hover:bg-primary/90 text-white">Enter as Citizen</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/rescue/login" className="transition-transform hover:scale-105">
            <Card className="h-full border-2 border-transparent hover:border-accent/20 shadow-md">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                  <Ambulance className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-headline">Rescue Dashboard</CardTitle>
                <CardDescription>View tickets, manage tasks, and navigate to emergency zones.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-accent hover:bg-accent/90 text-white">Enter as Rescue Team</Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="text-center pt-8 border-t border-slate-200">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border text-sm font-medium text-slate-600">
            <Lock className="h-4 w-4" />
            <span>Authenticated &amp; Encrypted System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
