'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/shared/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Users, Activity, Filter, CheckCircle, Phone, Plus, Navigation, AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { MOCK_TICKETS } from '@/lib/mock-data';
import { haversineDistance, getProximityScore } from '@/lib/geo';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Ticket } from '@/types';

// Dynamically import Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function RescuePage() {
  const [activeTab, setActiveTab] = useState('nearby');
  const [currentPos, setCurrentPos] = useState({ lat: 20.5937, lng: 78.9629 });
  const [markerIcon, setMarkerIcon] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const { user } = useUser();
  const userName = user?.fullName || user?.firstName || 'Rescue Leader';
  const { toast } = useToast();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }

    if (typeof window !== 'undefined') {
      import('leaflet').then(L => {
        const icon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
        setMarkerIcon(icon);
      });
    }
  }, []);

  // Compute nearby and assigned tickets based on acceptedIds
  const allTicketsWithDistance = useMemo(() => {
    return MOCK_TICKETS.map(t => ({
      ...t,
      distance: haversineDistance(currentPos.lat, currentPos.lng, t.location.lat, t.location.lng),
      proxScore: getProximityScore(haversineDistance(currentPos.lat, currentPos.lng, t.location.lat, t.location.lng))
    }));
  }, [currentPos]);

  const nearbyTickets = useMemo(() => {
    return allTicketsWithDistance
      .filter(t => t.status === 'Pending' && !acceptedIds.has(t.id))
      .filter(t => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            t.location.address.toLowerCase().includes(q) ||
            t.emergencyType.toLowerCase().includes(q) ||
            t.location.lat.toFixed(4).includes(q) ||
            t.location.lng.toFixed(4).includes(q)
          );
        }
        return true;
      })
      .filter(t => {
        if (filterCriticalOnly) return t.priority === 'Critical';
        return true;
      })
      .sort((a, b) => a.distance - b.distance);
  }, [allTicketsWithDistance, acceptedIds, searchQuery, filterCriticalOnly]);

  const myTasks = useMemo(() => {
    const originallyAccepted = allTicketsWithDistance.filter(t => t.status === 'Accepted');
    const newlyAccepted = allTicketsWithDistance.filter(t => acceptedIds.has(t.id));
    return [...originallyAccepted, ...newlyAccepted];
  }, [allTicketsWithDistance, acceptedIds]);

  const handleAcceptTask = (ticketId: string) => {
    setAcceptedIds(prev => new Set(prev).add(ticketId));
    toast({
      title: "Task Assigned",
      description: `GPS coordinates locked for signal ${ticketId}. Check your Tasks tab.`,
    });
  };

  const handleStartNavigation = (lat: number, lng: number, address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
    toast({
      title: "Navigation Started",
      description: `Opening Google Maps to ${address}.`,
    });
  };

  const handleToggleFilter = () => {
    setFilterCriticalOnly(prev => !prev);
    toast({
      title: filterCriticalOnly ? "Filter Cleared" : "Filter Active",
      description: filterCriticalOnly ? "Showing all priority signals." : "Showing only Critical priority signals.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header role="rescue" userName={userName} />
      
      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline text-slate-900">Rescue Dashboard</h1>
            <p className="text-slate-500 font-medium">Distance-weighted signal prioritization active.</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search address, type..." 
                className="pl-9 h-10 rounded-xl" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant={filterCriticalOnly ? "default" : "outline"} 
              size="icon" 
              className={`h-10 w-10 rounded-xl border-2 ${filterCriticalOnly ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}`}
              onClick={handleToggleFilter}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Tabs defaultValue="nearby" onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-14 bg-white border-2 p-1.5 rounded-2xl shadow-sm">
                <TabsTrigger value="nearby" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white font-bold">
                  Near Me ({nearbyTickets.length})
                </TabsTrigger>
                <TabsTrigger value="assigned" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white font-bold">
                  Tasks ({myTasks.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="nearby" className="mt-6 space-y-4">
                {nearbyTickets.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-slate-200">
                    <CheckCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">
                      {searchQuery || filterCriticalOnly ? 'No signals match your filters.' : 'No pending signals nearby.'}
                    </p>
                  </div>
                ) : nearbyTickets.map(ticket => (
                  <Card key={ticket.id} className="cursor-pointer hover:shadow-xl transition-all border-0 ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex justify-between items-center">
                        <Badge className={`font-bold uppercase tracking-wider ${ticket.priority === 'Critical' ? 'bg-red-500' : 'bg-orange-500'}`}>
                          {ticket.priority}
                        </Badge>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                          {ticket.distance.toFixed(1)} KM
                        </span>
                      </div>
                      <CardTitle className="text-lg mt-2 font-headline">{ticket.emergencyType}</CardTitle>
                      <CardDescription className="text-sm flex flex-col gap-1.5 mt-2">
                        <span className="flex items-center gap-1.5 font-bold text-slate-700 leading-tight">
                          <MapPin className="h-4 w-4 text-accent shrink-0" /> {ticket.location.address}
                        </span>
                        <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                          {ticket.location.lat.toFixed(4)}, {ticket.location.lng.toFixed(4)}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 pb-3">
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {ticket.numberOfPeople} Souls</div>
                        <div className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-green-500" /> Score: {ticket.proxScore.toFixed(0)}</div>
                      </div>
                    </CardContent>
                    <CardFooter className="px-5 pb-5 pt-0 flex gap-2">
                      <Button size="sm" className="w-full bg-accent hover:bg-accent/90 font-bold h-10 rounded-xl" onClick={() => handleAcceptTask(ticket.id)}>Accept Signal</Button>
                    </CardFooter>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="assigned" className="mt-6 space-y-4">
                 {myTasks.length === 0 ? (
                   <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-slate-200">
                      <CheckCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No active tasks.</p>
                   </div>
                 ) : myTasks.map(ticket => (
                    <Card key={ticket.id} className="border-l-8 border-l-green-500 shadow-lg rounded-2xl">
                      <CardHeader className="p-5 pb-3">
                        <CardTitle className="text-lg font-headline">{ticket.emergencyType}</CardTitle>
                        <CardDescription className="text-sm font-bold text-slate-700 mt-1">
                          {ticket.location.address}
                        </CardDescription>
                        <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded-md w-fit mt-1">
                          {ticket.location.lat.toFixed(4)}, {ticket.location.lng.toFixed(4)}
                        </span>
                      </CardHeader>
                      <CardFooter className="px-5 pb-5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full font-bold h-10 rounded-xl border-2 gap-2"
                          onClick={() => handleStartNavigation(ticket.location.lat, ticket.location.lng, ticket.location.address)}
                        >
                           <Navigation className="h-4 w-4" /> Start Navigation
                        </Button>
                      </CardFooter>
                    </Card>
                 ))}
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="h-[600px] relative overflow-hidden bg-slate-100 border-0 shadow-2xl rounded-3xl ring-4 ring-white z-0">
              {typeof window !== 'undefined' && (
                <MapContainer 
                  center={[currentPos.lat, currentPos.lng]} 
                  zoom={12} 
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {markerIcon && (
                    <>
                      <Marker position={[currentPos.lat, currentPos.lng]} icon={markerIcon}>
                        <Popup>Your Rescue Position</Popup>
                      </Marker>
                      {nearbyTickets.map((t) => (
                        <Marker key={t.id} position={[t.location.lat, t.location.lng]} icon={markerIcon}>
                          <Popup>{t.emergencyType} - {t.priority}</Popup>
                        </Marker>
                      ))}
                    </>
                  )}
                </MapContainer>
              )}

              <div className="absolute top-6 left-6 flex flex-col gap-2 z-[1000]">
                <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Live GPS Status</p>
                  <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                    <Activity className="h-3 w-3 animate-pulse" /> {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
                  </p>
                </div>
                {filterCriticalOnly && (
                  <div className="bg-red-600/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-xl text-white text-[10px] font-bold uppercase tracking-widest">
                    Critical Filter Active
                  </div>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="bg-white border-0 shadow-md border-l-8 border-l-blue-500 rounded-2xl">
                <CardHeader className="p-5 pb-0">
                  <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base station</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                   <p className="text-sm font-bold text-slate-700">HQ Sync Active</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-md border-l-8 border-l-accent rounded-2xl">
                <CardHeader className="p-5 pb-0">
                  <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Geo logic</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                   <p className="text-sm font-bold text-slate-700">Haversine weight active</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-md border-l-8 border-l-green-500 rounded-2xl">
                 <CardHeader className="p-5 pb-0">
                  <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Comms</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                   <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:bg-blue-50 font-bold rounded-xl h-10" asChild>
                     <a href="tel:112"><Phone className="h-4 w-4 mr-2" /> Call HQ</a>
                   </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
