'use client';

import React, { useState } from 'react';
import { Header } from '@/components/shared/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Plus, Phone, AlertCircle, Navigation, Shield } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { MOCK_TICKETS } from '@/lib/mock-data';

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

export default function CitizenPage() {
  const [isTicketDialogOpen, setTicketDialogOpen] = useState(false);
  const { user } = useUser();
  const userName = user?.fullName || user?.firstName || 'Citizen User';
  // Using mock data for high-speed prototype, avoiding Firestore permission errors
  const [tickets] = useState(MOCK_TICKETS.slice(0, 1)); 

  return (
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
                  <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl flex items-center gap-2 border-2 font-bold" asChild>
                    <a href="tel:112">
                      <Phone className="h-5 w-5 text-green-600" />
                      Call 112 (Unified)
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Tracking Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold font-headline flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                Active Requests
              </h3>
              
              {!tickets || tickets.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-slate-200">
                  <p className="text-slate-500">No active rescue requests found.</p>
                </div>
              ) : tickets.map((ticket) => (
                <Card key={ticket.id} className="overflow-hidden shadow-md border-0 ring-1 ring-slate-200">
                  <div className={`h-1.5 w-full ${ticket.status === 'Pending' ? 'bg-orange-400' : 'bg-green-500'}`}></div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-headline">{ticket.emergencyType}</CardTitle>
                        <CardDescription className="flex flex-col gap-1 mt-1">
                          <span className="flex items-center gap-1 font-bold text-slate-700"><MapPin className="h-3 w-3 text-red-500" /> {ticket.location.address}</span>
                        </CardDescription>
                      </div>
                      <Badge variant={ticket.status === 'Pending' ? 'outline' : 'default'} className={ticket.status === 'Pending' ? 'text-orange-600 border-orange-200 bg-orange-50' : 'bg-green-500'}>
                        {ticket.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Priority</span>
                        <span className={`font-semibold ${ticket.priority === 'Critical' ? 'text-red-600' : 'text-slate-700'}`}>{ticket.priority}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pincode</span>
                        <span className="font-semibold text-slate-700">{ticket.location.address.match(/\d{6}/)?.[0] || "Detected"}</span>
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fixed Coordinates</span>
                        <span className="font-mono text-[10px] text-slate-700">{ticket.location.lat.toFixed(5)}, {ticket.location.lng.toFixed(5)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 border-t p-3 text-center">
                    <span className="text-xs text-slate-500 w-full font-medium italic">Signals broadcast to nearby rescue teams.</span>
                  </CardFooter>
                </Card>
              ))}
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
  );
}
