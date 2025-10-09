'use client';

import { useState, useEffect, useRef } from 'react';
import type { User } from '@/lib/types';
import { TEAM_MEMBERS } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Hash,
  Send,
  Users,
  Clock,
  AlertCircle,
  Plus,
  Settings,
  Bell,
  MessageSquare,
  Zap,
  AtSign,
  Radio,
  Smile,
  Paperclip,
  Mic,
  Video,
  Phone,
  Search,
  PinIcon,
  MoreVertical,
  Reply,
  Edit,
  X,
  Trash2,
  Crown,
  Shield
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { emitBroadcastSent } from '@/lib/realtime';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  description?: string;
  category?: string;
  permissions: ('all' | 'users' | 'clients' | 'admins')[];
  isPrivate: boolean;
  pinnedMessages: string[];
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
    role: 'admin' | 'user' | 'client';
    status: 'online' | 'away' | 'busy' | 'offline';
  };
  channelId: string;
  timestamp: string;
  edited?: string;
  pinned: boolean;
  mentions: string[];
  attachments?: string[];
  reactions: { emoji: string; users: string[]; }[];
  replyTo?: string;
  type: 'message' | 'system' | 'announcement';
}

interface BroadcastingPageProps {
  currentUser: User;
}

const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'general',
    name: 'general',
    type: 'text',
    description: 'General discussion for all team members',
    category: 'TEXT CHANNELS',
    permissions: ['all'],
    isPrivate: false,
    pinnedMessages: [],
    createdAt: new Date().toISOString()
  },
  {
    id: 'announcements',
    name: 'announcements',
    type: 'announcement',
    description: 'Important company announcements',
    category: 'TEXT CHANNELS',
    permissions: ['all'],
    isPrivate: false,
    pinnedMessages: [],
    createdAt: new Date().toISOString()
  }
];

const ROLE_COLORS = {
  admin: 'text-red-500',
  user: 'text-blue-500',
  client: 'text-green-500'
};

const STATUS_INDICATORS = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

export default function BroadcastingPage({ currentUser }: BroadcastingPageProps) {
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const userRole = currentUser.role === 'admin' ? 'admin' :
                   currentUser.role === 'client' ? 'client' : 'user';

  useEffect(() => {
    // Load existing messages and channels
    const storedMessages = sessionStorage.getItem('discordMessages');
    const storedChannels = sessionStorage.getItem('discordChannels');

    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }

    if (storedChannels) {
      setChannels(JSON.parse(storedChannels));
    } else {
      // Initialize default channels
      sessionStorage.setItem('discordChannels', JSON.stringify(DEFAULT_CHANNELS));
    }

    // Simulate online users
    const allUsers = TEAM_MEMBERS.map(member => member.name);
    setOnlineUsers(allUsers.slice(0, Math.floor(Math.random() * allUsers.length) + 1));
  }, []);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages, activeChannel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveMessages = (updatedMessages: Message[]) => {
    setMessages(updatedMessages);
    sessionStorage.setItem('discordMessages', JSON.stringify(updatedMessages));
    window.dispatchEvent(new Event('discordMessagesChanged'));
  };

  const saveChannels = (updatedChannels: Channel[]) => {
    setChannels(updatedChannels);
    sessionStorage.setItem('discordChannels', JSON.stringify(updatedChannels));
  };

  const canUserAccessChannel = (channel: Channel): boolean => {
    if (channel.permissions.includes('all')) return true;
    if (channel.permissions.includes('admins') && userRole === 'admin') return true;
    if (channel.permissions.includes('users') && userRole === 'user') return true;
    if (channel.permissions.includes('clients') && userRole === 'client') return true;
    return false;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Message in #${activeChannel}`,
          message: newMessage,
          category: activeChannel,
          priority: 'Medium',
          vertex: currentUser.vertex || 'CMIS',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Create local message for immediate UI update
        const message: Message = {
          id: `msg_${Date.now()}`,
          content: newMessage,
          author: {
            name: currentUser.name,
            role: userRole,
            status: 'online'
          },
          channelId: activeChannel,
          timestamp: new Date().toISOString(),
          pinned: false,
          mentions: [],
          reactions: [],
          replyTo: replyingTo,
          type: activeChannel === 'announcements' ? 'announcement' : 'message'
        };

        const updatedMessages = [...messages, message];
        saveMessages(updatedMessages);

        setNewMessage('');
        setReplyingTo(null);
        setIsTyping(false);

        // Emit realtime event
        emitBroadcastSent(result.broadcast);

        toast({
          title: 'Message sent',
          description: 'Your message has been broadcast successfully.',
        });
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;

    const channel: Channel = {
      id: newChannelName.toLowerCase().replace(/\s+/g, '-'),
      name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
      type: 'text',
      description: newChannelDescription,
      category: 'TEXT CHANNELS',
      permissions: ['all'],
      isPrivate: false,
      pinnedMessages: [],
      createdAt: new Date().toISOString()
    };

    const updatedChannels = [...channels, channel];
    saveChannels(updatedChannels);

    setNewChannelName('');
    setNewChannelDescription('');
    setShowCreateChannel(false);

    toast({
      title: "Channel Created",
      description: `#${channel.name} has been created successfully.`,
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    const updatedMessages = messages.filter(msg => msg.id !== messageId);
    saveMessages(updatedMessages);
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    const updatedMessages = messages.map(msg =>
      msg.id === messageId
        ? { ...msg, content: newContent, edited: new Date().toISOString() }
        : msg
    );
    saveMessages(updatedMessages);
    setEditingMessage(null);
  };

  const handlePinMessage = (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;

    const updatedMessages = messages.map(msg =>
      msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg
    );
    saveMessages(updatedMessages);

    const updatedChannels = channels.map(channel =>
      channel.id === message.channelId
        ? { ...channel, pinnedMessages: message.pinned
            ? channel.pinnedMessages.filter(id => id !== messageId)
            : [...channel.pinnedMessages, messageId]
          }
        : channel
    );
    saveChannels(updatedChannels);
  };

  const getFilteredMessages = () => {
    return messages
      .filter(msg => msg.channelId === activeChannel)
      .filter(msg => searchQuery === '' ||
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.author.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getAccessibleChannels = () => {
    return channels.filter(canUserAccessChannel);
  };

  const currentChannel = channels.find(c => c.id === activeChannel);
  const filteredMessages = getFilteredMessages();
  const accessibleChannels = getAccessibleChannels();

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-background rounded-lg border overflow-hidden shadow-lg">
      {/* Channel Sidebar */}
      <div className="w-60 bg-secondary/30 border-r flex flex-col">
        {/* Server Header */}
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg">SyncFlow Team</h2>
          <p className="text-xs text-muted-foreground">Team Communication</p>
        </div>

        {/* Channels List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Text Channels
              </h3>
              {userRole === 'admin' && (
                <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Channel</DialogTitle>
                      <DialogDescription>
                        Add a new text channel to your server.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="channelName">Channel Name</Label>
                        <Input
                          id="channelName"
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="general"
                        />
                      </div>
                      <div>
                        <Label htmlFor="channelDescription">Description (Optional)</Label>
                        <Input
                          id="channelDescription"
                          value={newChannelDescription}
                          onChange={(e) => setNewChannelDescription(e.target.value)}
                          placeholder="Channel description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateChannel(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateChannel}>Create Channel</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Channel List */}
            <div className="space-y-1">
              {accessibleChannels.map((channel) => (
                <Button
                  key={channel.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left h-8 px-2",
                    activeChannel === channel.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                  onClick={() => setActiveChannel(channel.id)}
                >
                  <Hash className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="truncate">{channel.name}</span>
                  {channel.type === 'announcement' && <Crown className="h-3 w-3 ml-1 flex-shrink-0" />}
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* User Info */}
        <div className="p-3 border-t bg-secondary/50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                  {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", STATUS_INDICATORS.online)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <p className={cn("text-xs", ROLE_COLORS[userRole])}>{userRole}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-12 border-b px-4 flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <h1 className="font-semibold">{currentChannel?.name}</h1>
            {currentChannel?.description && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <p className="text-sm text-muted-foreground">{currentChannel.description}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-36 pl-7 text-xs"
              />
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Bell className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <PinIcon className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Users className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Welcome to #{currentChannel?.name}!</h3>
                <p className="text-sm text-muted-foreground">
                  {currentChannel?.description || 'This is the start of your conversation.'}
                </p>
              </div>
            ) : (
              filteredMessages.map((message, index) => {
                const isConsecutive = index > 0 &&
                  filteredMessages[index - 1].author.name === message.author.name &&
                  new Date(message.timestamp).getTime() - new Date(filteredMessages[index - 1].timestamp).getTime() < 5 * 60 * 1000;

                return (
                  <div key={message.id} className={cn("group hover:bg-secondary/50 px-4 py-1 rounded", {
                    "mt-4": !isConsecutive,
                    "bg-amber-50 dark:bg-amber-950/20": message.pinned
                  })}>
                    <div className="flex gap-3">
                      {!isConsecutive ? (
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                              {message.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", STATUS_INDICATORS[message.author.status])} />
                        </div>
                      ) : (
                        <div className="w-10 flex-shrink-0 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                            {format(parseISO(message.timestamp), 'HH:mm')}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {!isConsecutive && (
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className={cn("font-semibold text-sm hover:underline cursor-pointer", ROLE_COLORS[message.author.role])}>
                              {message.author.name}
                            </span>
                            {message.author.role === 'admin' && (
                              <Crown className="h-3 w-3 text-yellow-500" />
                            )}
                            {message.author.role === 'user' && (
                              <Shield className="h-3 w-3 text-blue-500" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(message.timestamp), 'MMM d, yyyy HH:mm')}
                            </span>
                            {message.edited && (
                              <span className="text-xs text-muted-foreground">(edited)</span>
                            )}
                            {message.pinned && (
                              <PinIcon className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                        )}

                        {message.replyTo && (
                          <div className="ml-6 mb-1 text-xs text-muted-foreground border-l-2 border-muted pl-2">
                            Replying to {filteredMessages.find(m => m.id === message.replyTo)?.author.name}
                          </div>
                        )}

                        <div className="text-sm leading-relaxed break-words">
                          {editingMessage === message.id ? (
                            <Input
                              defaultValue={message.content}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditMessage(message.id, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingMessage(null);
                                }
                              }}
                              onBlur={(e) => handleEditMessage(message.id, e.currentTarget.value)}
                              className="h-7 text-sm"
                              autoFocus
                            />
                          ) : (
                            <span className={message.type === 'announcement' ? 'font-medium text-primary' : ''}>
                              {message.content}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Message Actions */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setReplyingTo(message.id)}
                        >
                          <Reply className="h-3 w-3" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(message.author.name === currentUser.name || userRole === 'admin') && (
                              <>
                                <DropdownMenuItem onClick={() => setEditingMessage(message.id)}>
                                  <Edit className="h-3 w-3 mr-2" />
                                  Edit Message
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteMessage(message.id)} className="text-red-600">
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete Message
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {userRole === 'admin' && (
                              <DropdownMenuItem onClick={() => handlePinMessage(message.id)}>
                                <PinIcon className="h-3 w-3 mr-2" />
                                {message.pinned ? 'Unpin Message' : 'Pin Message'}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          {replyingTo && (
            <div className="mb-2 p-2 bg-secondary/50 rounded text-sm text-muted-foreground flex items-center justify-between">
              <span>Replying to {filteredMessages.find(m => m.id === replyingTo)?.author.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-4 w-4 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                placeholder={`Message #${currentChannel?.name}`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="pr-24"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Smile className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Paperclip className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="sm"
              className="h-9"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Use Shift + Enter for new line</span>
            {onlineUsers.length > 0 && (
              <span>{onlineUsers.length} members online</span>
            )}
          </div>
        </div>
      </div>

      {/* Members Sidebar */}
      <div className="w-60 bg-secondary/30 border-l">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Members — {onlineUsers.length}</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            <div className="mb-2">
              <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                Online — {onlineUsers.length}
              </h4>
              {TEAM_MEMBERS.filter(member => onlineUsers.includes(member.name)).map((member) => (
                <div key={member.empId} className="flex items-center gap-2 p-1 rounded hover:bg-secondary/50">
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-blue-600 text-white font-bold">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background", STATUS_INDICATORS.online)} />
                  </div>
                  <span className="text-sm truncate">{member.name}</span>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Offline — {TEAM_MEMBERS.length - onlineUsers.length}
              </h4>
              {TEAM_MEMBERS.filter(member => !onlineUsers.includes(member.name)).map((member) => (
                <div key={member.empId} className="flex items-center gap-2 p-1 rounded hover:bg-secondary/50 opacity-50">
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-gray-400 to-gray-600 text-white font-bold">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background", STATUS_INDICATORS.offline)} />
                  </div>
                  <span className="text-sm truncate">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}