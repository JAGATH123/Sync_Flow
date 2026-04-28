
'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/types';
import { ALL_USERS as INITIAL_ALL_USERS } from '@/lib/mock-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Crown, User as UserIcon, Shield } from 'lucide-react';

interface UserSwitcherProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
}

const getRoleIcon = (role: User['role']) => {
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
}


export default function UserSwitcher({ currentUser, setCurrentUser }: UserSwitcherProps) {
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_ALL_USERS);

  useEffect(() => {
    const handleUserChange = () => {
      const storedUsers = sessionStorage.getItem('allUsers');
      if (storedUsers) {
        setAllUsers(JSON.parse(storedUsers));
      }
    };
    
    // Initial load
    handleUserChange();

    window.addEventListener('userChanged', handleUserChange);
    return () => {
      window.removeEventListener('userChanged', handleUserChange);
    };
  }, []);

  const handleUserChange = (email: string) => {
    const user = allUsers.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      // Store user in session storage to persist across page navigations
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      // Dispatch a custom event to notify other components of the change
      window.dispatchEvent(new Event('userChanged'));
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="font-semibold text-foreground flex items-center gap-2 justify-end">
          {getRoleIcon(currentUser.role)}
          {currentUser.name}
        </p>
        <p className="text-sm text-muted-foreground capitalize">{currentUser.role} View</p>
      </div>
      <Select onValueChange={handleUserChange} value={currentUser.email}>
        <SelectTrigger className="w-12 h-12 p-0 rounded-full">
            <SelectValue asChild>
                <Avatar>
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${currentUser.email}`} />
                    <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allUsers.map((user) => (
            <SelectItem key={user.email} value={user.email}>
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://i.pravatar.cc/150?u=${user.email}`} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
