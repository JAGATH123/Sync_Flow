'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  X,
  Clock,
  AlertCircle,
  MessageSquare,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetAudience: 'all' | 'users' | 'clients' | 'team';
  createdAt: string;
  status: 'sent' | 'draft';
  readBy: string[];
}

interface BroadcastMessagesProps {
  userRole: 'user' | 'client' | 'admin';
  userName?: string;
}

const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    color: 'bg-gray-500',
    icon: MessageSquare,
    bgColor: 'bg-gray-50 dark:bg-gray-950/30',
    borderColor: 'border-gray-200 dark:border-gray-800'
  },
  medium: {
    label: 'Medium',
    color: 'bg-blue-500',
    icon: Bell,
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  high: {
    label: 'High',
    color: 'bg-orange-500',
    icon: AlertCircle,
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-red-500',
    icon: Zap,
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800'
  }
};

export default function BroadcastMessages({ userRole, userName = 'user' }: BroadcastMessagesProps) {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [readMessages, setReadMessages] = useState<string[]>([]);

  useEffect(() => {
    const loadMessages = () => {
      const storedMessages = sessionStorage.getItem('broadcastMessages');
      if (storedMessages) {
        const allMessages: BroadcastMessage[] = JSON.parse(storedMessages);

        // Filter messages based on user role and target audience
        const filteredMessages = allMessages.filter(message => {
          if (message.targetAudience === 'all') return true;
          if (message.targetAudience === 'users' && userRole === 'user') return true;
          if (message.targetAudience === 'clients' && userRole === 'client') return true;
          if (message.targetAudience === 'team' && (userRole === 'user' || userRole === 'admin')) return true;
          return false;
        });

        // Sort by priority and date
        const sortedMessages = filteredMessages
          .filter(msg => msg.status === 'sent')
          .sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

        setMessages(sortedMessages);
      }
    };

    // Load messages initially
    loadMessages();

    // Listen for broadcast message changes
    const handleBroadcastChange = () => {
      loadMessages();
    };

    window.addEventListener('broadcastMessagesChanged', handleBroadcastChange);
    return () => window.removeEventListener('broadcastMessagesChanged', handleBroadcastChange);
  }, [userRole]);

  useEffect(() => {
    // Load read messages from localStorage
    const storedReadMessages = localStorage.getItem(`readBroadcastMessages_${userName}`);
    if (storedReadMessages) {
      setReadMessages(JSON.parse(storedReadMessages));
    }
  }, [userName]);

  const markAsRead = (messageId: string) => {
    if (!readMessages.includes(messageId)) {
      const updatedReadMessages = [...readMessages, messageId];
      setReadMessages(updatedReadMessages);
      localStorage.setItem(`readBroadcastMessages_${userName}`, JSON.stringify(updatedReadMessages));
    }
  };

  const unreadCount = messages.filter(msg => !readMessages.includes(msg.id)).length;
  const urgentCount = messages.filter(msg => msg.priority === 'urgent' && !readMessages.includes(msg.id)).length;

  if (messages.length === 0) {
    return null; // Don't render anything if no messages
  }

  return (
    <Card className={cn(
      "relative",
      urgentCount > 0 && "ring-2 ring-red-500 ring-opacity-50"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  urgentCount > 0 ? "bg-red-100 dark:bg-red-950/30" : "bg-primary/10"
                )}>
                  <Bell className={cn(
                    "h-5 w-5",
                    urgentCount > 0 ? "text-red-600" : "text-primary"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Announcements
                    {unreadCount > 0 && (
                      <Badge className={cn(
                        "text-xs",
                        urgentCount > 0 ? "bg-red-500" : "bg-primary"
                      )}>
                        {unreadCount} new
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {urgentCount > 0 ? `${urgentCount} urgent messages` : `${messages.length} total messages`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {urgentCount > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    URGENT
                  </Badge>
                )}
                <Button variant="ghost" size="sm">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {messages.map((message) => {
                  const isRead = readMessages.includes(message.id);
                  const config = PRIORITY_CONFIG[message.priority];
                  const Icon = config.icon;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all cursor-pointer",
                        config.bgColor,
                        config.borderColor,
                        isRead ? "opacity-60" : "opacity-100",
                        !isRead && "ring-1 ring-primary/20"
                      )}
                      onClick={() => markAsRead(message.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <h4 className={cn(
                            "font-semibold text-sm",
                            !isRead && "font-bold"
                          )}>
                            {message.title}
                            {!isRead && <span className="ml-2 text-blue-600">●</span>}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-white text-xs", config.color)}>
                            {config.label}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {message.message}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{format(parseISO(message.createdAt), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                        {!isRead && (
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Click on messages to mark as read</span>
              <span>{messages.length - readMessages.length} unread</span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}