
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Loader2, User, Hash, Target, Map as MapIcon, AlertCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Leaflet needs window, so we import it dynamically
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });

const formSchema = z.object({
  emergencyType: z.enum(['Trapped', 'Injured', 'Medical emergency', 'Food/Water shortage', 'Elderly/Child rescue', 'Other']),
  numberOfPeople: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().min(1)),
  notes: z.string().optional(),
  location: z.string().min(5, "Please click on the map to pinpoint location"),
  pincode: z.string().min(6, "Please provide a valid 6-digit pincode").max(10),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

function MapEventsHandler({ onLocationSelected }: { onLocationSelected: (lat: number, lng: number) => void }) {
  // Import useMapEvents directly — it's safe here because this component
  // is only rendered inside the dynamically-imported MapContainer (SSR-safe)
  const { useMapEvents } = require('react-leaflet');
  useMapEvents({
    click(e: any) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function CreateTicketDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [markerIcon, setMarkerIcon] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emergencyType: 'Trapped',
      numberOfPeople: 1 as any,
      notes: '',
      location: '',
      pincode: '',
    },
  });

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

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'FloodGuardConnect/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || 'Selected Location';
        
        let postcode = '';
        // 1. Check the structured address object
        if (data.address?.postcode) {
          postcode = data.address.postcode;
        } 
        
        // 2. Fallback: Search for 6-digit Indian pincode in the display name string
        const pinMatch = address.match(/\b\d{6}\b/);
        if (pinMatch) {
          postcode = pinMatch[0];
        }

        // Clean and validate Indian pincode (6 digits)
        const cleanedPincode = postcode.replace(/\D/g, '').substring(0, 6);
        
        form.setValue('location', address);
        if (cleanedPincode && cleanedPincode.length === 6) {
          form.setValue('pincode', cleanedPincode);
        } else {
          form.setValue('pincode', ''); 
          toast({
            title: "Manual Pincode Required",
            description: "We couldn't detect the exact pincode. Please enter it manually.",
          });
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Failed to fetch address. You can still enter it manually.",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleLocationPicked = (lat: number, lng: number) => {
    form.setValue('latitude', lat);
    form.setValue('longitude', lng);
    reverseGeocode(lat, lng);
    toast({
      title: "Pin Dropped",
      description: "Fetching address and pincode details...",
    });
  };

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
      });
      return;
    }

    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue('latitude', latitude);
        form.setValue('longitude', longitude);
        await reverseGeocode(latitude, longitude);
        setIsLocating(false);
        toast({
          title: "GPS Lock Success",
          description: "Location accurately detected.",
        });
      },
      (error) => {
        setIsLocating(false);
        toast({
          variant: "destructive",
          title: "GPS Failed",
          description: "Please allow location access or click manually on the map to pinpoint the issue.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const auth = getAuth();
      const db = getFirestore();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      // Derive priority: Trapped + Medical = Critical, else High or Medium
      const criticalTypes = ['Trapped', 'Injured', 'Medical emergency'];
      const priority = criticalTypes.includes(values.emergencyType) ? 'Critical' : 'High';

      await addDoc(collection(db, 'emergency_tickets'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Citizen',
        emergencyType: values.emergencyType,
        numberOfPeople: values.numberOfPeople,
        notes: values.notes || '',
        priority,
        status: 'pending',
        location: {
          address: values.location,
          lat: values.latitude ?? 0,
          lng: values.longitude ?? 0,
          pincode: values.pincode,
        },
        assignedTo: null,
        assignedName: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: '🚨 SOS Signal Transmitted',
        description: 'Rescue crews have been notified of your precise coordinates.',
      });
      form.reset();
      onClose();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: err.message || 'Could not save your ticket. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedLat = form.watch('latitude');
  const selectedLng = form.watch('longitude');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] overflow-y-auto max-h-[95vh] rounded-3xl border-0 shadow-2xl p-0">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-3xl font-headline font-bold text-slate-900">Report Emergency</DialogTitle>
            <DialogDescription className="text-base font-medium text-slate-500">
              Pinpoint the issue location directly on the map for fastest rescue response.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            
            <div className="relative h-[400px] w-full bg-slate-100 border-y border-slate-200 overflow-hidden z-0">
              {typeof window !== 'undefined' && (
                <MapContainer 
                  center={[selectedLat || 20.5937, selectedLng || 78.9629]} 
                  zoom={selectedLat ? 16 : 5} 
                  style={{ height: '100%', width: '100%' }}
                  className="z-0 cursor-crosshair"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <MapEventsHandler onLocationSelected={handleLocationPicked} />
                  {selectedLat && selectedLng && markerIcon && (
                    <Marker position={[selectedLat, selectedLng]} icon={markerIcon} />
                  )}
                </MapContainer>
              )}

              <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl text-[11px] font-bold text-slate-800 shadow-xl border border-slate-100 uppercase tracking-widest flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                  Click map to pin location
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-[1000] pointer-events-none">
                 <div className="flex gap-2 pointer-events-auto">
                    {selectedLat && (
                      <div className="bg-slate-900 text-white px-4 py-2 rounded-full text-[12px] font-bold shadow-2xl flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-red-500" />
                        {selectedLat.toFixed(5)}, {selectedLng?.toFixed(5)}
                      </div>
                    )}
                    {isGeocoding && (
                      <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[12px] font-bold text-slate-800 shadow-xl flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Identifying location...
                      </div>
                    )}
                 </div>
                 
                 <Button 
                    type="button"
                    variant="secondary" 
                    className="bg-primary hover:bg-primary/90 text-white font-bold shadow-xl rounded-xl gap-2 h-11 px-5 border-none transition-all active:scale-95 pointer-events-auto"
                    onClick={handleAutoLocate}
                    disabled={isLocating}
                  >
                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                    Detect My GPS
                  </Button>
              </div>
            </div>

            <div className="px-6 space-y-5 py-6 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-slate-600 font-bold uppercase text-[10px] tracking-widest flex justify-between">
                        <span>Pinned Location Address</span>
                        {field.value && <span className="text-green-600 flex items-center gap-1"><MapIcon className="h-3 w-3" /> GPS Confirmed</span>}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} className="pl-10 h-12 rounded-xl border-2 focus:border-primary font-medium text-sm" placeholder="Pin a location on the map above..." readOnly />
                          <MapIcon className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Pincode (6 Digits)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} className="pl-10 h-12 rounded-xl border-2 focus:border-primary font-bold" placeholder="Detecting..." maxLength={6} />
                          <Hash className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="numberOfPeople"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Souls Affected</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" {...field} className="pl-10 h-12 rounded-xl border-2 focus:border-primary font-bold" min="1" />
                          <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Emergency Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-2 font-bold">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Trapped">Trapped (Rising Water)</SelectItem>
                          <SelectItem value="Injured">Medical/Injured</SelectItem>
                          <SelectItem value="Medical emergency">Ongoing Medical Need</SelectItem>
                          <SelectItem value="Food/Water shortage">Food/Water Shortage</SelectItem>
                          <SelectItem value="Elderly/Child rescue">Elderly/Child Priority</SelectItem>
                          <SelectItem value="Other">Other Distress</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Additional Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your situation (e.g. 'Stuck on terrace', 'Need insulin', '3 children with us')..." 
                          className="min-h-[100px] resize-none rounded-xl border-2 font-medium"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t mt-4">
                <Button type="button" variant="ghost" className="rounded-xl h-12 font-bold order-2 sm:order-1" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button 
                  type="submit" 
                  className="bg-red-600 hover:bg-red-700 min-w-[240px] h-12 rounded-xl shadow-xl text-white font-black uppercase tracking-wider transition-all active:scale-95 order-1 sm:order-2" 
                  disabled={isSubmitting || !selectedLat}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      TRANSMITTING...
                    </>
                  ) : (
                    "BROADCAST SOS SIGNAL"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

