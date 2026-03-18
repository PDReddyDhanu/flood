'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/shared/Header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Map as MapIcon, 
  AlertTriangle, 
  BarChart3, 
  ShieldCheck,
  Megaphone,
  MapPin,
  Navigation,
  AlertCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUser } from '@clerk/nextjs';
import { MOCK_TICKETS } from '@/lib/mock-data';
import { haversineDistance } from '@/lib/geo';
import { useToast } from '@/hooks/use-toast';

// Dynamically import Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

// Component to capture and expose the map instance
function MapController({ mapRef }: { mapRef: React.MutableRefObject<any> }) {
  if (typeof window !== 'undefined') {
    const { useMap } = require('react-leaflet');
    const map = useMap();
    mapRef.current = map;
  }
  return null;
}

export default function AdminPage() {
  const { user } = useUser();
  const userName = user?.fullName || user?.firstName || 'Admin Commander';
  const [markerIcon, setMarkerIcon] = useState<any>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const { toast } = useToast();
  const mapRef = useRef<any>(null);
  const tickets = MOCK_TICKETS;
  const hqLoc = { lat: 20.5937, lng: 78.9629 };

  useEffect(() => {
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

  const handleResetView = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.flyTo([hqLoc.lat, hqLoc.lng], 5, { duration: 1.5 });
      toast({
        title: "Map Reset",
        description: "View restored to command center overview.",
      });
    }
  }, [toast, hqLoc.lat, hqLoc.lng]);

  const handleTrack = useCallback((lat: number, lng: number, address: string) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 15, { duration: 1.5 });
      toast({
        title: "Tracking Signal",
        description: `Map focused on: ${address}`,
      });
    }
  }, [toast]);

  const handleBroadcast = useCallback(() => {
    if (!broadcastMsg.trim()) {
      toast({
        variant: "destructive",
        title: "Empty Message",
        description: "Please enter an alert message before broadcasting.",
      });
      return;
    }
    toast({
      title: "Alert Broadcasted",
      description: `Signal dispatched to all ${tickets.length} active nodes: "${broadcastMsg.substring(0, 50)}${broadcastMsg.length > 50 ? '...' : ''}"`,
    });
    setBroadcastMsg('');
  }, [broadcastMsg, toast, tickets.length]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header role="admin" userName={userName} />
      
      <main className="container max-w-7xl mx-auto px-4 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase">Total Signals</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tickets.length}</div>
              <p className="text-xs text-slate-500 mt-1">Active GPS locks</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase">Mean Proximity</CardTitle>
              <Navigation className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">2.4 KM</div>
              <p className="text-xs text-slate-500 mt-1">Avg distance to HQ</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase">Rescue Teams</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">42</div>
              <p className="text-xs text-slate-500 mt-1">Active nodes online</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase">Response</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">12m</div>
              <p className="text-xs text-slate-500 mt-1">Optimization active</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-0 shadow-xl overflow-hidden rounded-3xl">
              <CardHeader className="border-b bg-white">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-headline">Signal Heatmap</CardTitle>
                    <CardDescription>Visualizing coordinate-based distress data.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2 border-2" onClick={handleResetView}>
                    <MapIcon className="h-4 w-4" /> Reset View
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 relative h-[400px] z-0">
                {typeof window !== 'undefined' && (
                  <MapContainer 
                    center={[hqLoc.lat, hqLoc.lng]} 
                    zoom={5} 
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapController mapRef={mapRef} />
                    {markerIcon && (
                      <>
                        <Marker position={[hqLoc.lat, hqLoc.lng]} icon={markerIcon}>
                          <Popup>HQ Command Center</Popup>
                        </Marker>
                        {tickets.map((t) => (
                          <Marker key={t.id} position={[t.location.lat, t.location.lng]} icon={markerIcon}>
                            <Popup>{t.location.address}</Popup>
                          </Marker>
                        ))}
                      </>
                    )}
                  </MapContainer>
                )}
              </CardContent>
              <CardFooter className="bg-slate-50 border-t flex justify-between px-6 py-4">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase">
                  <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-red-600"></div> Critical Signal</span>
                  <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-orange-500"></div> High Density</span>
                </div>
              </CardFooter>
            </Card>

            <Card className="border-0 shadow-xl overflow-hidden rounded-3xl">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-xl font-headline">Distress Database</CardTitle>
                <CardDescription>Coordinate proximity tracking active.</CardDescription>
              </CardHeader>
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>GPS Landmark</TableHead>
                    <TableHead>HQ Distance</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => {
                    const dist = haversineDistance(hqLoc.lat, hqLoc.lng, ticket.location.lat, ticket.location.lng);
                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 font-bold text-slate-700">
                              <MapPin className="h-3 w-3 text-primary" /> {ticket.location.address}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {ticket.location.lat.toFixed(4)}, {ticket.location.lng.toFixed(4)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                           <span className="text-xs font-bold text-slate-600">{dist.toFixed(2)} KM</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ticket.priority === 'Critical' ? 'destructive' : 'default'} className={ticket.priority === 'Critical' ? 'bg-red-600' : 'bg-orange-500'}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-bold uppercase text-slate-600">{ticket.status}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 font-bold"
                            onClick={() => handleTrack(ticket.location.lat, ticket.location.lng, ticket.location.address)}
                          >
                            Track
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-800 text-white">
                <CardTitle className="text-lg font-headline">Broadcast Center</CardTitle>
                <CardDescription className="text-slate-400">Dispatch alerts to all nodes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <textarea 
                  className="w-full min-h-[120px] p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-primary focus:ring-0 resize-none text-sm font-medium" 
                  placeholder="Enter alert message..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                />
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl gap-2"
                  onClick={handleBroadcast}
                >
                  <Megaphone className="h-4 w-4" /> Broadcast GPS Signal
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 text-white overflow-hidden rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Geo Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs opacity-70 uppercase tracking-widest font-bold">Sync Mode</p>
                  <p className="text-sm font-semibold">Coordinate Lock Active</p>
                </div>
                <div className="space-y-1 pt-3 border-t border-white/10">
                  <p className="text-xs opacity-70 uppercase tracking-widest font-bold">Nodes</p>
                  <p className="text-sm text-green-400 font-bold">Active Communication Live</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
