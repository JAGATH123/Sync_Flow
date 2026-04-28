'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store user data and token in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      // Show success message
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${data.user.name}!`,
      });

      // Force a page reload to ensure proper authentication state
      console.log('Login successful - reloading page to ensure proper state');
      window.location.href = '/';

    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (role: 'admin' | 'user' | 'client') => {
    const credentials = {
      admin: { email: 'admin@taskflow.com', password: 'admin123' },
      user: { email: 'alex.j@taskflow.com', password: 'user123' },
      client: { email: 'client@example.com', password: 'client123' }
    };
    console.log('Filling demo credentials for role:', role, 'Credentials:', credentials[role]);
    setFormData(credentials[role]);
    setError('');
  };

  return (
    <div className="min-h-screen bg-secondary/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Login Form */}
        <Card className="p-4">
          <CardHeader className="text-center pb-10 pt-10">
            <div className="flex flex-col items-center justify-center gap-8">
              <div className="w-full flex items-center justify-center">
                <Image
                  src="/logo_lof.png"
                  alt="LOF Logo"
                  width={200}
                  height={200}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="space-y-3">
                <CardTitle className="text-4xl font-bold tracking-tight">SyncFlow</CardTitle>
                <CardDescription className="text-lg">
                  Sign in to your account
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-8">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    required
                    className="h-12 text-base pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 px-8 pb-8">
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* <div className="w-full space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Demo Credentials:
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemoCredentials('admin')}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    Admin: admin@taskflow.com
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemoCredentials('user')}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    User: alex.j@taskflow.com
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemoCredentials('client')}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    Client: client@example.com
                  </Button>
                </div>
              </div> */}
            </CardFooter>
          </form>
        </Card>

        {/* Footer */}
        {/* <p className="text-center text-sm text-muted-foreground">
          SyncFlow - One hub for tasks, tracking, and costs
        </p> */}
      </div>
    </div>
  );
}