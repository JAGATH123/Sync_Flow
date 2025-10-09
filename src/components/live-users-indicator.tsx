
'use client';

import { useState, useEffect } from 'react';
import type { TeamMember } from '@/lib/types';
import { TEAM_MEMBERS } from '@/lib/mock-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};


export default function LiveUsersIndicator() {
  const [liveUsers, setLiveUsers] = useState<TeamMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const storedMembers = sessionStorage.getItem('teamMembers');
    const members = storedMembers ? JSON.parse(storedMembers) : TEAM_MEMBERS;
    setTeamMembers(members);
  }, []);

  useEffect(() => {
    if (teamMembers.length > 0) {
      // Simulate live users - pick a random number of users (2 to 4)
      const shuffled = shuffleArray(teamMembers);
      const count = Math.floor(Math.random() * 3) + 2;
      setLiveUsers(shuffled.slice(0, count));
    }
  }, [teamMembers]);
  
  if (liveUsers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="relative h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </div>
        <div className="flex -space-x-2">
          {liveUsers.map((user) => (
            <Tooltip key={user.email}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold">
                    {user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.name} is live</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
