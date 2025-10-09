'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ClientDashboard from '@/components/client-dashboard';

export default function ClientPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect non-client users
    if (!isLoading && (!user || user.role !== 'client')) {
      if (user?.role === 'admin') {
        router.push('/admin');
      } else if (user?.role === 'user') {
        router.push('/user');
      } else {
        router.push('/login');
      }
    }
  }, [isLoading, user, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Loading client dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if no user or not client
  if (!user || user.role !== 'client') {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-background">
      <ClientDashboard currentUser={user} />
    </main>
  );
}