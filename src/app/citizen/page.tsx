'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/shared/Header';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Plus, Phone, AlertCircle, Navigation, Shield, Clock, Truck, Flag, PackageCheck, CheckCircle } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { collection, query, where, onSnapshot, getFirestore } from 'firebase/firestore';

const HELPLINE_DATA = [
  { label: 'National Emergency Number', number: '112' },
  { label: 'Police', number: '100' },
  { label: 'Fire', number: '101' },
  { label: 'Ambulance', number: '102' },
  { label: 'Traffic Police', number: '103' },
  { label: 'Women Helpline', number: '1091' },
  { label: 'Women Helpline (Domestic)', number: '181' },
  { label: 'AIDS Helpline', number: '1097' },
  { label: 'Disaster Management', number: '108' },
  { label: 'Indian Railway General', number: '131' },
  { label: 'Railway Enquiry', number: '139' },
  { label: 'Telephone Complaint', number: '199' },
  { label: 'Anti-Corruption Helpline', number: '1031' },
  { label: 'Highway Emergency', number: '1033' },
  { label: 'Anti-Poison', number: '1069' },
  { label: 'Train Accident', number: '1011' },
  { label: 'Road Accident', number: '1073' },
  { label: 'Earthquake Helpline', number: '1092' },
  { label: 'LPG Emergency', number: '1906' },
  { label: 'Child Abuse Hotline', number: '1098' },
  { label: 'Blood Bank Info', number: '1910' },
  { label: 'Election Commission', number: '1950' },
  { label: 'Consumer Helpline', number: '1800114000' },
  { label: 'Tourist Helpline', number: '1363' },
  { label: 'COVID-19 Helpline', number: '1075' },
];

// Status display config
const STATUS_COLORS: Record<string, string> = {
  pending: 'text-orange-600 border-orange-200 bg-orange-50',
  accepted: 'text-blue-600 border-blue-200 bg-blue-50',
  en_route: 'text-purple-600 border-purple-200 bg-purple-50',
  reached: 'text-indigo-600 border-indigo-200 bg-indigo-50',
  completed: 'text-green-600 border-green-200 bg-green-50',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending — Awaiting rescue team',
  accepted: 'Accepted — Rescue team en route',
  en_route: 'En Route — Help is coming!',
  reached: 'Reached — Team on site',
  completed: 'Completed ✓',
};
const STATUS_BAR: Record<string, string> = {
  pending: 'bg-orange-400',
  accepted: 'bg-blue-500',
  en_route: 'bg-purple-500',
  reached: 'bg-indigo-500',
  completed: 'bg-green-500',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  accepted: <CheckCircle className="h-3.5 w-3.5" />,
  en_route: <Truck className="h-3.5 w-3.5" />,
  reached: <Flag className="h-3.5 w-3.5" />,
  completed: <PackageCheck className="h-3.5 w-3.5" />,
};

export default function CitizenPage() {
  const [isTicketDialogOpen, setTicketDialogOpen] = useState(false);
  const { userData, user } = useUser();
  const userName = userData?.name || 'Citizen User';
  const [tickets, setTickets] = useState<any[]>([]);
  const db = getFirestore();

  // Live Firestore: fetch this citizen's tickets
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'emergency_tickets'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      // Sort client-side (newest first) — avoids composite index on userId+createdAt
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setTickets(docs);
    });
    return () => unsub();
  }, [db, user]);

  return (
    <AuthGuard role="citizen">
    <div className="min-h-screen bg-slate-50">
      <Header role="citizen" userName={userName} />
      
      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Action Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* SOS Trigger Section */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-red-100 text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold font-headline text-slate-900">Distress Request</h2>
                <p className="text-slate-500 font-medium">Automatic coordinate capture enabled for faster response.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                <button 
                  className="w-48 h-48 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-[0_0_0_15px_rgba(220,38,38,0.1)] active:scale-95 transition-all flex flex-col items-center justify-center"
                  onClick={() => setTicketDialogOpen(true)}
                >
                  <AlertCircle className="h-16 w-16 mb-2" />
                  <span className="text-2xl font-black uppercase">SEND SOS</span>
                </button>
                
                <div className="flex flex-col gap-4 w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="bg-primary hover:bg-primary/90 text-white h-14 px-8 rounded-2xl flex items-center gap-2 font-bold"
                    onClick={() => setTicketDialogOpen(true)}
                  >
                    <Plus className="h-5 w-5" />
                    New Request
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 rounded-2xl flex items-center gap-2 border-2 font-bold border-primary text-primary hover:bg-primary hover:text-white transition-all"
                    onClick={() => document.getElementById('active-requests')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Navigation className="h-5 w-5" />
                    Track My Requests
                  </Button>
                </div>
              </div>
            </div>

            {/* Tracking Section */}
            <div className="space-y-4">
              <h3 id="active-requests" className="text-xl font-bold font-headline flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                Active Requests
                {tickets.length > 0 && <span className="text-sm font-normal text-slate-400">({tickets.length})</span>}
              </h3>

              {tickets.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-slate-200">
                  <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No active rescue requests.</p>
                  <p className="text-slate-400 text-sm">Press SOS or New Request to raise an alert.</p>
                </div>
              ) : tickets.map(ticket => {
                const status: string = ticket.status || 'pending';
                return (
                  <Card key={ticket.id} className="overflow-hidden shadow-md border-0 ring-1 ring-slate-200">
                    {/* Status progress bar */}
                    <div className={`h-1.5 w-full ${STATUS_BAR[status] ?? 'bg-slate-200'}`} />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-headline">{ticket.emergencyType}</CardTitle>
                          <CardDescription className="flex flex-col gap-1 mt-1">
                            <span className="flex items-center gap-1 font-bold text-slate-700">
                              <MapPin className="h-3 w-3 text-red-500" /> {ticket.location?.address}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={`flex items-center gap-1 ${STATUS_COLORS[status] ?? ''}`}>
                          {STATUS_ICON[status]} {status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium text-slate-600 bg-slate-50 rounded-xl px-4 py-2">
                        {STATUS_LABEL[status] ?? status}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3 text-xs">
                        <div className="flex flex-col">
                          <span className="text-slate-400 uppercase font-bold tracking-wider">Priority</span>
                          <span className={`font-semibold ${ticket.priority === 'Critical' ? 'text-red-600' : 'text-slate-700'}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-400 uppercase font-bold tracking-wider">People</span>
                          <span className="font-semibold text-slate-700">{ticket.numberOfPeople ?? 1}</span>
                        </div>
                        <div className="flex flex-col col-span-2 sm:col-span-1">
                          <span className="text-slate-400 uppercase font-bold tracking-wider">Coords</span>
                          <span className="font-mono text-[10px] text-slate-700">
                            {ticket.location?.lat?.toFixed(5)}, {ticket.location?.lng?.toFixed(5)}
                          </span>
                        </div>
                      </div>
                      {ticket.assignedName && status !== 'pending' && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Assigned to: {ticket.assignedName}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 border-t p-3 text-center">
                      <span className="text-xs text-slate-500 w-full font-medium italic">
                        {status === 'completed'
                          ? 'Your request has been resolved. Stay safe!'
                          : 'Signal broadcast to nearby rescue teams.'}
                      </span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

          </div>

          {/* Sidebar Area: Helplines */}
          <div className="space-y-6">
            <Card className="border-0 shadow-md ring-1 ring-slate-200 overflow-hidden">
              <CardHeader className="bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle className="text-lg font-headline">Govt Helplines</CardTitle>
                </div>
                <CardDescription className="text-slate-400 text-xs">Official Indian Emergency Contacts</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[550px]">
                  <div className="divide-y">
                    {HELPLINE_DATA.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                        <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                        <a href={`tel:${item.number}`} className="text-xs font-bold text-primary flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                          <Phone className="h-3 w-3" />
                          {item.number}
                        </a>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="bg-slate-50 p-4 border-t flex flex-col gap-2">
                <p className="text-[10px] text-slate-500 text-center w-full uppercase tracking-widest font-bold">Unified Support: 112</p>
                <p className="text-[10px] text-slate-400 text-center w-full italic">Dial 112 for Police, Fire, and Medical.</p>
              </CardFooter>
            </Card>

            <Card className="bg-primary text-white overflow-hidden shadow-lg border-0 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Signal Protocol</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm opacity-90">Verify your pincode manually if GPS accuracy is low in flood conditions.</p>
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <h4 className="text-xs font-bold uppercase mb-1">Landmark Tip</h4>
                  <p className="text-sm font-semibold">Mention specific color of building or nearby towers.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <CreateTicketDialog 
        isOpen={isTicketDialogOpen} 
        onClose={() => setTicketDialogOpen(false)} 
      />
    </div>
    </AuthGuard>
  );
}
