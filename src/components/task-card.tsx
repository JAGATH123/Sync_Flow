
'use client';

import type { Task, User, TeamMember } from '@/types';
import { TEAM_MEMBERS as INITIAL_TEAM_MEMBERS } from '@/lib/mock-data';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User as UserIcon, Flag, Clock, ClipboardCheck, AlertTriangle, Briefcase, Calendar, CheckCircle, XCircle, CalendarClock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import Link from 'next/link';
import { format, parseISO, isBefore, isEqual as isDateEqual } from 'date-fns';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

interface TaskCardProps {
  task: Task;
  currentUser: User;
}

const getPriorityBadgeClass = (priority: Task['priority']) => {
    switch(priority) {
      case 'High': return 'bg-red-500 text-white hover:bg-red-600';
      case 'Medium': return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'Low': return 'bg-gray-500 text-white hover:bg-gray-600';
      default: return 'bg-gray-400 text-white';
    }
}

const getCompletionStatus = (task: Task): { text: string; className: string; icon: React.ElementType } | null => {
    if (task.status !== 'Delivered' || !task.completionDate) {
      return null;
    }

    const endDate = parseISO(task.endDate);
    const completionDate = parseISO(task.completionDate);

    if (isBefore(completionDate, endDate)) {
      return { text: 'Early', className: 'bg-blue-500 hover:bg-blue-600 text-white', icon: CheckCircle };
    }
    if (isDateEqual(completionDate, endDate)) {
      return { text: 'On Time', className: 'bg-green-500 hover:bg-green-600 text-white', icon: CheckCircle };
    }
    return { text: 'Late', className: 'bg-red-500 hover:bg-red-600 text-white', icon: XCircle };
};

// Helper function to safely render assignedTo (handles both string and object)
const getAssignedToName = (assignedTo: any) => {
  if (typeof assignedTo === 'string') {
    return assignedTo;
  }
  if (typeof assignedTo === 'object' && assignedTo !== null) {
    return assignedTo.name || assignedTo.email || assignedTo._id || 'Unknown';
  }
  return 'Unassigned';
};

// Helper function to safely render client (handles both string and object)
const getClientName = (client: any) => {
  if (typeof client === 'string') {
    return client;
  }
  if (typeof client === 'object' && client !== null) {
    return client.name || client.email || client._id || 'Unknown Client';
  }
  return 'Unknown Client';
};

export default function TaskCard({ task, currentUser }: TaskCardProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  useEffect(() => {
    const storedMembers = sessionStorage.getItem('teamMembers');
    if (storedMembers) {
      setTeamMembers(JSON.parse(storedMembers));
    } else {
      setTeamMembers(INITIAL_TEAM_MEMBERS);
    }

    // Listen for team member changes
    const handleTeamMemberChange = () => {
      const updatedMembers = sessionStorage.getItem('teamMembers');
      if (updatedMembers) {
        setTeamMembers(JSON.parse(updatedMembers));
      }
    };

    window.addEventListener('teamMembersChanged', handleTeamMemberChange);
    return () => {
      window.removeEventListener('teamMembersChanged', handleTeamMemberChange);
    };
  }, []);

  const assignedUser = teamMembers.find(
    (member) => member.name === getAssignedToName(task.assignedTo)
  );

  const extraHours =
    task.actualWorkingHours && task.actualWorkingHours > task.workingHours
      ? task.actualWorkingHours - task.workingHours
      : 0;

  const completionStatus = getCompletionStatus(task);

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md flex flex-col',
        task.progress === 100 && 'border-green-500'
      )}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold leading-tight pr-2">
            {task.name}
          </CardTitle>
           <Button asChild variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <Link href={`/task/${task._id || task.id}`}>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">View Task</span>
                </Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span>{getAssignedToName(task.assignedTo)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span>{getClientName(task.client)}</span>
          </div>
           <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-4 w-4" />
            <span>Created: {format(parseISO(task.createdDate), 'MMM d, yyyy')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`start-date-${task.id}`} className="text-xs">
              Start Date
            </Label>
            <Input
              id={`start-date-${task.id}`}
              type="date"
              value={task.startDate}
              disabled
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor={`end-date-${task.id}`} className="text-xs">
              End Date
            </Label>
            <Input
              id={`end-date-${task.id}`}
              type="date"
              value={task.endDate}
              disabled
              className="h-8 text-xs"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                    {task.actualWorkingHours || 0}h
                </span>
                <span className="text-muted-foreground">/ {task.workingHours}h</span>
            </div>
            {extraHours > 0 && (
                <span className="font-bold text-red-500 text-xs">
                    +{extraHours}h extra
                </span>
            )}
        </div>

        <div>
          <div className="text-sm font-medium mb-1 flex justify-between">
            <span>Progress</span>
            <span className="text-primary font-semibold">{task.progress}%</span>
          </div>
          <Progress
            value={task.progress}
            id={`progress-bar-${task.id}`}
            className="w-full h-2"
          />
        </div>

        {task.status === 'Delivered' && task.reviewStatus && (
          <div className="flex items-center justify-between text-sm pt-2">
            <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Review:</span>
                <span className="font-semibold">{task.reviewStatus}</span>
            </div>
            {completionStatus && (
                <Badge className={cn('text-xs', completionStatus.className)}>
                    <completionStatus.icon className="mr-1 h-3 w-3" />
                    {completionStatus.text}
                </Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-muted/50 p-4 mt-auto">
        <Badge className={cn('text-xs', getPriorityBadgeClass(task.priority))}>
            <AlertTriangle className="mr-1 h-3 w-3" />
            {task.priority}
        </Badge>
        <Badge
          variant={task.progress === 100 ? 'default' : 'secondary'}
          className={cn(
            'text-xs',
            task.progress === 100 &&
              'bg-green-600 text-white hover:bg-green-700',
            task.status === 'On Hold' &&
              'bg-orange-500 text-white hover:bg-orange-600',
            task.status === 'In Progress' &&
              'bg-sky-500 text-white hover:bg-sky-600'
          )}
        >
          <Flag className="mr-1 h-3 w-3" />
          {task.progress === 100 ? 'Delivered' : task.status}
        </Badge>
      </CardFooter>
    </Card>
  );
}
