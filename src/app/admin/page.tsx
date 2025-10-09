'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminDashboard from '@/components/admin-dashboard';

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect non-admin users
    if (!isLoading && (!user || user.role !== 'admin')) {
      if (user?.role === 'user') {
        router.push('/user');
      } else if (user?.role === 'client') {
        router.push('/client');
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
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if no user or not admin
  if (!user || user.role !== 'admin') {
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
      <AdminDashboard currentUser={user} />
    </main>
  );
}