'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Crown, User as UserIcon, Shield, LogOut, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin':
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 'client':
      return <Shield className="h-4 w-4 text-blue-500" />;
    case 'user':
      return <UserIcon className="h-4 w-4 text-green-500" />;
    default:
      return null;
  }
};

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      toast({
        title: 'Logout failed',
        description: 'There was an error logging out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-12 w-auto px-3 rounded-full">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-foreground flex items-center gap-2 justify-end">
                {getRoleIcon(user.role)}
                {user.name}
              </p>
              <p className="text-sm text-muted-foreground capitalize">{user.role} View</p>
            </div>
            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                {user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none flex items-center gap-2">
              {getRoleIcon(user.role)}
              {user.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {user.role} Account
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.empId && (
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>ID: {user.empId}</span>
          </DropdownMenuItem>
        )}
        {user.designation && (
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>{user.designation}</span>
          </DropdownMenuItem>
        )}
        {user.vertex && (
          <DropdownMenuItem disabled>
            <Shield className="mr-2 h-4 w-4" />
            <span>Vertex: {user.vertex}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}