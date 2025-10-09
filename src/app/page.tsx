
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();


  useEffect(() => {
    // Role-based routing for both development and production
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else {
        switch (user.role) {
          case 'admin':
            router.push('/admin');
            break;
          case 'user':
            router.push('/user');
            break;
          case 'client':
            router.push('/client');
            break;
          default:
            router.push('/login');
        }
      }
    }
  }, [isLoading, user, router]);

  // Show loading while determining where to redirect
  return (
    <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
