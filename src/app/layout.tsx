import type { Metadata } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'FloodGuard Connect — SFMS',
  description: 'Real-time emergency coordination for flood disasters. Saving lives through smart technology.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="font-body antialiased bg-background min-h-screen">
        <ClerkProvider>
          <FirebaseClientProvider>
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
