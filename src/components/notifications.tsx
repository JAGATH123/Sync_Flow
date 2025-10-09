
'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { AppNotification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadNotifications = () => {
      const storedNotifications = sessionStorage.getItem('notifications');
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }
    };

    loadNotifications();

    window.addEventListener('notificationsChanged', loadNotifications);
    return () => {
      window.removeEventListener('notificationsChanged', loadNotifications);
    };
  }, []);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && unreadCount > 0) {
      // Mark all as read when popover is closed
      const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updatedNotifications);
      sessionStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      // Dispatch event to ensure other components are aware, though not strictly necessary here
      window.dispatchEvent(new Event('notificationsChanged'));
    }
  };
  
  const handleClearAll = () => {
    setNotifications([]);
    sessionStorage.setItem('notifications', JSON.stringify([]));
    window.dispatchEvent(new Event('notificationsChanged'));
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={handleClearAll}>
              Clear all
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-80">
          {notifications.length > 0 ? (
            notifications.map(notif => (
              <div key={notif.id} className="p-2 border-b last:border-none">
                <p className="text-sm">{notif.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                </p>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <p className="text-sm text-muted-foreground">No new notifications.</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
