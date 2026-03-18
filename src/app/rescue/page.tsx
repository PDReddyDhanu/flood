'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/shared/Header';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search, MapPin, Users, Activity, Filter, CheckCircle,
  Phone, Navigation, Truck, Flag, PackageCheck, Clock, Bell, Zap,
} from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { haversineDistance, getProximityScore } from '@/lib/geo';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  collection, query, where, onSnapshot, doc, updateDoc, getFirestore,
} from 'firebase/firestore';
import { SendNotificationDialog } from '@/components/shared/SendNotificationDialog';

// Dynamically import Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// ── Status config ──────────────────────────────────────────────────────────────
export type TicketStatus = 'pending' | 'accepted' | 'en_route' | 'reached' | 'completed';

const STATUS_NEXT: Record<TicketStatus, TicketStatus | null> = {
  pending: 'accepted',
  accepted: 'en_route',
  en_route: 'reached',
  reached: 'completed',
  completed: null,
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  en_route: 'En Route',
  reached: 'Reached',
  completed: 'Completed',
};

const STATUS_ACTION: Record<TicketStatus, string> = {
  pending: 'Accept Signal',
  accepted: 'Mark En Route',
  en_route: 'Mark Reached',
  reached: 'Mark Completed',
  completed: 'Done',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  pending: 'bg-slate-200 text-slate-600',
  accepted: 'bg-blue-100 text-blue-700',
  en_route: 'bg-orange-100 text-orange-700',
  reached: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};

const STATUS_ICON: Record<TicketStatus, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  accepted: <CheckCircle className="h-3.5 w-3.5" />,
  en_route: <Truck className="h-3.5 w-3.5" />,
  reached: <Flag className="h-3.5 w-3.5" />,
  completed: <PackageCheck className="h-3.5 w-3.5" />,
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function RescuePage() {
  const [currentPos, setCurrentPos] = useState({ lat: 20.5937, lng: 78.9629 });
  const [markerIcon, setMarkerIcon] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [pendingTickets, setPendingTickets] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const { userData, user } = useUser();
  const userName = userData?.name || 'Rescue Leader';
  const { toast } = useToast();
  const db = getFirestore();

  const statsActive = myTasks.filter(t => ['accepted', 'en_route', 'reached'].includes(t.status)).length;
  const statsCompleted = myTasks.filter(t => t.status === 'completed').length;

  // ── Geolocation & Leaflet icon ────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos =>
      setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    );
    if (typeof window !== 'undefined') {
      import('leaflet').then(L => {
        setMarkerIcon(L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41],
        }));
      });
    }
  }, []);

  // ── Live Firestore: pending tickets (Near Me) ─────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'emergency_tickets'),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, snap => {
      // Sort client-side to avoid composite index requirement
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPendingTickets(docs);
    });
    return () => unsub();
  }, [db]);

  // ── Live Firestore: my tasks (accepted/en_route/reached/completed) ────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'emergency_tickets'),
      where('assignedTo', '==', user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      // Sort client-side to avoid composite index requirement
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
      setMyTasks(docs);
    });
    return () => unsub();
  }, [db, user]);

  // ── Nearby tickets with distance, filtered ────────────────────────────────
  const nearbyTickets = useMemo(() => {
    return pendingTickets
      .map(t => ({
        ...t,
        distance: haversineDistance(currentPos.lat, currentPos.lng, t.location.lat, t.location.lng),
        proxScore: getProximityScore(haversineDistance(currentPos.lat, currentPos.lng, t.location.lat, t.location.lng)),
      }))
      .filter(t => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return t.location.address.toLowerCase().includes(q) ||
            t.emergencyType?.toLowerCase().includes(q);
        }
        return true;
      })
      .filter(t => filterCriticalOnly ? t.priority === 'Critical' : true)
      .sort((a, b) => a.distance - b.distance);
  }, [pendingTickets, currentPos, searchQuery, filterCriticalOnly]);

  // ── Accept or advance status ──────────────────────────────────────────────
  const handleAdvanceStatus = async (ticket: any) => {
    const currentStatus: TicketStatus = ticket.status;
    const nextStatus = STATUS_NEXT[currentStatus];
    if (!nextStatus || !user) return;

    setUpdatingId(ticket.id);
    try {
      const update: Record<string, any> = {
        status: nextStatus,
        updatedAt: new Date(),
      };

      // On accept: assign to this rescue team member
      if (currentStatus === 'pending') {
        update.assignedTo = user.uid;
        update.assignedName = userData?.name || 'Rescue Member';
        update.acceptedAt = new Date();
      }
      if (nextStatus === 'en_route') update.enRouteAt = new Date();
      if (nextStatus === 'reached') update.reachedAt = new Date();
      if (nextStatus === 'completed') update.completedAt = new Date();

      await updateDoc(doc(db, 'emergency_tickets', ticket.id), update);

      toast({
        title: nextStatus === 'accepted' ? 'Signal Accepted!' : `Status: ${STATUS_LABEL[nextStatus]}`,
        description: currentStatus === 'pending'
          ? 'Ticket moved to your Tasks tab.'
          : `Updated to "${STATUS_LABEL[nextStatus]}" successfully.`,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update ticket status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartNavigation = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <AuthGuard role="rescue">
      <div className="min-h-screen bg-slate-50">
        <Header role="rescue" userName={userName} />

        <main className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
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
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant={filterCriticalOnly ? 'default' : 'outline'}
                size="icon"
                className={`h-10 w-10 rounded-xl border-2 ${filterCriticalOnly ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}`}
                onClick={() => setFilterCriticalOnly(p => !p)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-2 font-bold gap-2 border-primary text-primary hover:bg-primary hover:text-white"
                onClick={() => setNotifOpen(true)}
              >
                <Bell className="h-4 w-4" /> Notify Citizens
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mb-7">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Near Me</p>
                <p className="text-xl font-black text-slate-800">{nearbyTickets.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Truck className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active</p>
                <p className="text-xl font-black text-slate-800">{statsActive}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
                <PackageCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Done</p>
                <p className="text-xl font-black text-slate-800">{statsCompleted}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Left: Tabs ── */}
            <div className="lg:col-span-1 space-y-6">
              <Tabs defaultValue="nearby" className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-14 bg-white border-2 p-1.5 rounded-2xl shadow-sm">
                  <TabsTrigger value="nearby" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white font-bold">
                    Near Me ({nearbyTickets.length})
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="rounded-xl data-[state=active]:bg-accent data-[state=active]:text-white font-bold">
                    Tasks ({myTasks.length})
                  </TabsTrigger>
                </TabsList>

                {/* ── Near Me ── */}
                <TabsContent value="nearby" className="mt-6 space-y-4">
                  {nearbyTickets.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-slate-200">
                      <CheckCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">
                        {searchQuery || filterCriticalOnly ? 'No signals match your filters.' : 'No pending signals nearby.'}
                      </p>
                    </div>
                  ) : nearbyTickets.map(ticket => (
                    <Card key={ticket.id} className="hover:shadow-xl transition-all border-0 ring-1 ring-slate-200 rounded-2xl overflow-hidden">
                      <CardHeader className="p-5 pb-3">
                        <div className="flex justify-between items-center">
                          <Badge className={`font-bold uppercase ${ticket.priority === 'Critical' ? 'bg-red-500' : 'bg-orange-500'}`}>
                            {ticket.priority}
                          </Badge>
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                            {ticket.distance?.toFixed(1)} KM
                          </span>
                        </div>
                        <CardTitle className="text-lg mt-2 font-headline">{ticket.emergencyType}</CardTitle>
                        <CardDescription className="text-sm flex flex-col gap-1.5 mt-2">
                          <span className="flex items-center gap-1.5 font-bold text-slate-700">
                            <MapPin className="h-4 w-4 text-accent shrink-0" /> {ticket.location?.address}
                          </span>
                          <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                            {ticket.location?.lat?.toFixed(4)}, {ticket.location?.lng?.toFixed(4)}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-5 pb-3">
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                          <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {ticket.numberOfPeople ?? 0} Souls</div>
                          <div className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-green-500" /> Score: {ticket.proxScore?.toFixed(0) ?? 0}</div>
                        </div>
                      </CardContent>
                      <CardFooter className="px-5 pb-5 pt-0">
                        <Button
                          size="sm"
                          className="w-full bg-accent hover:bg-accent/90 font-bold h-10 rounded-xl"
                          disabled={updatingId === ticket.id}
                          onClick={() => handleAdvanceStatus(ticket)}
                        >
                          {updatingId === ticket.id ? 'Accepting…' : 'Accept Signal'}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </TabsContent>

                {/* ── Tasks ── */}
                <TabsContent value="tasks" className="mt-6 space-y-4">
                  {myTasks.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-slate-200">
                      <CheckCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">No active tasks. Accept a signal to get started.</p>
                    </div>
                  ) : myTasks.map(ticket => {
                    const status: TicketStatus = ticket.status;
                    const nextStatus = STATUS_NEXT[status];
                    return (
                      <Card key={ticket.id} className={`border-l-4 shadow-lg rounded-2xl ${status === 'completed' ? 'border-l-green-500 opacity-75' : 'border-l-accent'}`}>
                        <CardHeader className="p-5 pb-2">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={`text-xs font-bold flex items-center gap-1 ${STATUS_COLORS[status]}`}>
                              {STATUS_ICON[status]} {STATUS_LABEL[status]}
                            </Badge>
                            <Badge className={`font-bold uppercase text-xs ${ticket.priority === 'Critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-headline">{ticket.emergencyType}</CardTitle>
                          <CardDescription className="text-sm font-semibold text-slate-700 mt-1">
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-accent shrink-0" />{ticket.location?.address}</span>
                          </CardDescription>
                          <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded-md w-fit mt-1 inline-block">
                            {ticket.location?.lat?.toFixed(4)}, {ticket.location?.lng?.toFixed(4)}
                          </span>
                        </CardHeader>
                        <CardFooter className="px-5 pb-4 pt-1 flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full font-bold h-9 rounded-xl border-2 gap-2"
                            onClick={() => handleStartNavigation(ticket.location.lat, ticket.location.lng)}
                          >
                            <Navigation className="h-4 w-4" /> Navigate
                          </Button>
                          {nextStatus && (
                            <Button
                              size="sm"
                              className={`w-full font-bold h-9 rounded-xl gap-1.5 ${status === 'reached' ? 'bg-green-600 hover:bg-green-700' : 'bg-accent hover:bg-accent/90'}`}
                              disabled={updatingId === ticket.id}
                              onClick={() => handleAdvanceStatus(ticket)}
                            >
                              {STATUS_ICON[status]}
                              {updatingId === ticket.id ? 'Updating…' : STATUS_ACTION[status as TicketStatus]}
                            </Button>
                          )}
                          {status === 'completed' && (
                            <div className="flex items-center justify-center gap-1.5 text-green-600 font-bold text-sm w-full py-1">
                              <PackageCheck className="h-4 w-4" /> Mission Complete
                            </div>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </div>

            {/* ── Right: Map ── */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="h-[500px] relative overflow-hidden bg-slate-100 border-0 shadow-2xl rounded-3xl ring-4 ring-white z-0">
                {typeof window !== 'undefined' && (
                  <MapContainer
                    center={[currentPos.lat, currentPos.lng]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {markerIcon && (
                      <>
                        <Marker position={[currentPos.lat, currentPos.lng]} icon={markerIcon}>
                          <Popup>Your Rescue Position</Popup>
                        </Marker>
                        {nearbyTickets.map(t => (
                          <Marker key={t.id} position={[t.location.lat, t.location.lng]} icon={markerIcon}>
                            <Popup>{t.emergencyType} — {t.priority}</Popup>
                          </Marker>
                        ))}
                        {myTasks.filter(t => t.status !== 'completed').map(t => (
                          <Marker key={t.id} position={[t.location.lat, t.location.lng]} icon={markerIcon}>
                            <Popup>🟢 MY TASK: {t.emergencyType} [{STATUS_LABEL[t.status as TicketStatus]}]</Popup>
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
                      <Activity className="h-3 w-3 animate-pulse" />
                      {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Active tasks summary */}
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg rounded-2xl">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">My Active Tasks</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <p className="text-3xl font-black">{statsActive}</p>
                    <p className="text-xs opacity-70 mt-0.5">En route / On-site</p>
                  </CardContent>
                </Card>

                {/* Send notification to citizens */}
                <Card className="bg-white border-0 shadow-md border-l-8 border-l-primary rounded-2xl">
                  <CardHeader className="p-5 pb-0">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Citizen Broadcast</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <Button
                      size="sm"
                      className="w-full bg-primary hover:bg-primary/90 font-bold rounded-xl h-10 gap-2"
                      onClick={() => setNotifOpen(true)}
                    >
                      <Bell className="h-4 w-4" /> Send Alert
                    </Button>
                  </CardContent>
                </Card>

                {/* Emergency call */}
                <Card className="bg-white border-0 shadow-md border-l-8 border-l-red-500 rounded-2xl">
                  <CardHeader className="p-5 pb-0">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Emergency Line</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <Button variant="ghost" size="sm" className="w-full text-red-600 hover:bg-red-50 font-bold rounded-xl h-10 border-2 border-red-100 gap-2" asChild>
                      <a href="tel:108"><Phone className="h-4 w-4" />Disaster Mgmt: 108</a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Send Notification Dialog */}
      <SendNotificationDialog
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        senderRole="rescue"
      />
    </AuthGuard>
  );
}
