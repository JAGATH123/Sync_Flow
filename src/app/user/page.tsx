'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import UserDashboard from '@/components/user-dashboard';

export default function UserPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect non-user users
    if (!isLoading && (!user || user.role !== 'user')) {
      if (user?.role === 'admin') {
        router.push('/admin');
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
          <p className="text-muted-foreground">Loading user dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if no user or not user role
  if (!user || user.role !== 'user') {
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
      <UserDashboard currentUser={user} />
    </main>
  );
}