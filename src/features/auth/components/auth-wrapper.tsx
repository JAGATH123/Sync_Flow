'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'user' | 'client')[];
}

export default function AuthWrapper({ children, allowedRoles }: AuthWrapperProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('AuthWrapper: isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user?.email, 'role:', user?.role);

    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('AuthWrapper: Not authenticated, redirecting to login');
        router.push('/login');
        return;
      }

      if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // User doesn't have permission for this page
        console.log('AuthWrapper: User does not have required role, redirecting to unauthorized');
        router.push('/unauthorized');
        return;
      }

      console.log('AuthWrapper: User is authenticated and authorized');
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or unauthorized
  if (!isAuthenticated || (allowedRoles && user && !allowedRoles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}