'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Header } from '@/components/shared/Header';
import { AuthGuard } from '@/components/shared/AuthGuard';
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
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { SendNotificationDialog } from '@/components/shared/SendNotificationDialog';

// Server-side-safe map components
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
// MapController must also be dynamic so useMap() only runs client-side
const MapController = dynamic(
  () =>
    import('react-leaflet').then((mod) => {
      const { useMap } = mod;
      function Controller({ mapRef }: { mapRef: React.MutableRefObject<any> }) {
        const map = useMap();
        mapRef.current = map;
        return null;
      }
      return Controller;
    }),
  { ssr: false }
);

interface PendingRescuer {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  teamName?: string;
  status: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  accepted: 'bg-blue-100 text-blue-700',
  en_route: 'bg-purple-100 text-purple-700',
  reached: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
};

export default function AdminPage() {
  const { userData } = useUser();
  const userName = userData?.name || 'Admin Commander';
  const [markerIcon, setMarkerIcon] = useState<any>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const { toast } = useToast();
  const mapRef = useRef<any>(null);
  const db = useFirestore();

  // Live ticket data from Firestore
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  useEffect(() => {
    const q = query(collection(db, 'emergency_tickets'));
    const unsub = onSnapshot(q, snap => {
      // Sort client-side (newest first) — avoids index requirement
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setAllTickets(docs);
    });
    return () => unsub();
  }, [db]);

  const [pendingRescuers, setPendingRescuers] = useState<PendingRescuer[]>([]);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

  // Load pending rescuers
  const loadPendingRescuers = useCallback(async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'rescue'), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      setPendingRescuers(snap.docs.map(d => d.data() as PendingRescuer));
    } catch (err) { console.error(err); }
  }, [db]);

  useEffect(() => { loadPendingRescuers(); }, [loadPendingRescuers]);

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

  const handleApproveRescuer = async (uid: string, name: string, approve: boolean) => {
    setApprovalLoading(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { status: approve ? 'approved' : 'rejected' });
      toast({
        title: approve ? 'Rescue Team Approved' : 'Registration Rejected',
        description: `${name} has been ${approve ? 'approved' : 'rejected'}.`,
      });
      setPendingRescuers(prev => prev.filter(r => r.uid !== uid));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    } finally {
      setApprovalLoading(null);
    }
  };

  const handleResetView = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.flyTo([hqLoc.lat, hqLoc.lng], 5, { duration: 1.5 });
      toast({ title: 'Map Reset', description: 'View restored to command center overview.' });
    }
  }, [toast, hqLoc.lat, hqLoc.lng]);

  const handleTrack = useCallback((lat: number, lng: number, address: string) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 15, { duration: 1.5 });
      toast({ title: 'Tracking Signal', description: `Map focused on: ${address}` });
    }
  }, [toast]);

  const handleBroadcast = useCallback(() => {
    if (!broadcastMsg.trim()) {
      toast({ variant: 'destructive', title: 'Empty Message', description: 'Please enter an alert message before broadcasting.' });
      return;
    }
    toast({
      title: 'Alert Broadcasted',
      description: `Signal dispatched to all ${allTickets.length} active nodes: "${broadcastMsg.substring(0, 50)}${broadcastMsg.length > 50 ? '...' : ''}"`,
    });
    setBroadcastMsg('');
  }, [broadcastMsg, toast, allTickets.length]);

  return (
    <>
    <AuthGuard role="admin">
      <div className="min-h-screen bg-slate-50">
        <Header role="admin" userName={userName} />

        <main className="container max-w-7xl mx-auto px-4 py-8">

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Total Signals</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
        <div className="text-3xl font-bold">{allTickets.length}</div>
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

            <Link href="/admin/users" className="block">
              <Card className="border-0 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase">User Management</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {pendingRescuers.length > 0 ? (
                      <span className="text-orange-500">{pendingRescuers.length} pending</span>
                    ) : (
                      <span>Manage</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Citizens &amp; rescue teams →</p>
                </CardContent>
              </Card>
            </Link>

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

          {/* Rescue Team Approvals */}
          <Card className="border-0 shadow-xl overflow-hidden rounded-3xl mb-8">
            <CardHeader className="bg-white border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-headline">Rescue Team Approvals</CardTitle>
                  <CardDescription>Review and approve pending rescue team registrations.</CardDescription>
                </div>
                {pendingRescuers.length > 0 && (
                  <Badge className="ml-auto bg-orange-500 text-white font-bold">{pendingRescuers.length} Pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingRescuers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                  <CheckCircle className="h-10 w-10 text-green-300" />
                  <p className="text-slate-400 font-medium">No pending approvals. All clear!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRescuers.map(r => (
                      <TableRow key={r.uid}>
                        <TableCell className="font-semibold">{r.name}</TableCell>
                        <TableCell className="text-slate-500">{r.email}</TableCell>
                        <TableCell>{r.teamName || '—'}</TableCell>
                        <TableCell>{r.phone || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold gap-1"
                              onClick={() => handleApproveRescuer(r.uid, r.name, true)}
                              disabled={approvalLoading === r.uid}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-red-200 text-red-600 hover:bg-red-50 font-bold gap-1"
                              onClick={() => handleApproveRescuer(r.uid, r.name, false)}
                              disabled={approvalLoading === r.uid}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Main Content */}
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
                          {allTickets.filter(t => t.location?.lat).map(t => (
                            <Marker key={t.id} position={[t.location.lat, t.location.lng]} icon={markerIcon}>
                              <Popup>{t.location.address} — {t.status?.toUpperCase()}</Popup>
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
                  <CardDescription>All tickets — live from Firestore.</CardDescription>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>GPS Landmark</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-8">No tickets yet.</TableCell>
                      </TableRow>
                    )}
                    {allTickets.map(ticket => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 font-bold text-slate-700">
                              <MapPin className="h-3 w-3 text-primary" /> {ticket.location?.address}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {ticket.location?.lat?.toFixed(4)}, {ticket.location?.lng?.toFixed(4)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ticket.priority === 'Critical' ? 'destructive' : 'default'}
                            className={ticket.priority === 'Critical' ? 'bg-red-600' : 'bg-orange-500'}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_BADGE[ticket.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {ticket.status?.replace('_', ' ').toUpperCase() ?? 'PENDING'}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">
                          {ticket.assignedName ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" size="sm" className="h-8 font-bold"
                            onClick={() => handleTrack(ticket.location?.lat, ticket.location?.lng, ticket.location?.address)}
                          >
                            Track
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-800 text-white">
                  <CardTitle className="text-lg font-headline">Broadcast Center</CardTitle>
                  <CardDescription className="text-slate-400">Send notifications to citizens, rescue teams, or all.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <p className="text-sm text-slate-600">Use the system notification channel to alert citizens, rescue teams, or everyone about critical updates, weather, or operational changes.</p>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl gap-2"
                    onClick={() => setNotifOpen(true)}
                  >
                    <Megaphone className="h-4 w-4" /> Compose & Send Notification
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
    </AuthGuard>

    <SendNotificationDialog
      isOpen={notifOpen}
      onClose={() => setNotifOpen(false)}
      senderRole="admin"
    />
    </>
  );
}
