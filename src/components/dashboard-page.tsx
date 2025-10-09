
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { User, Task, Vertices, TaskPriority, ClientStakeholder } from '@/lib/types';
import { MOCK_TASKS, MOCK_VERTICES, MOCK_CLIENTS as INITIAL_MOCK_CLIENTS } from '@/lib/mock-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import { Search, Calendar, Clock, User as UserIcon, AlertTriangle, Briefcase, ChevronDown, LayoutGrid, List, IndianRupee, ChevronRight, ExternalLink, Share2, Eye, EyeOff, CalendarPlus, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from './ui/scroll-area';
import TaskCard from './task-card';
import { Button } from './ui/button';
import { COST_RATES } from '@/lib/types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';


interface DashboardPageProps {
  initialTasks: Task[];
  currentUser: User;
}

const getMonths = () => {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
};

const getYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({
    id: currentYear - i,
    value: currentYear - i,
    label: (currentYear - i).toString()
  }));
};

const priorityOrder: Record<TaskPriority, number> = {
  'Urgent': 1,
  'High': 2,
  'Medium': 3,
  'Low': 4,
};

const vertexColorClasses: Record<Vertices, string> = {
    CMIS: 'bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    LOF: 'bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800 text-green-800 dark:text-green-200',
    TRI: 'bg-yellow-100 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    TRG: 'bg-purple-100 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 text-purple-800 dark:text-purple-200',
    'VB World': 'bg-indigo-100 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200',
    'CMG': 'bg-pink-100 border-pink-200 dark:bg-pink-900/30 dark:border-pink-800 text-pink-800 dark:text-pink-200',
    'Jahangir': 'bg-teal-100 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800 text-teal-800 dark:text-teal-200',
    'LOF Curriculum': 'bg-cyan-100 border-cyan-200 dark:bg-cyan-900/30 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200',
};

const getPriorityBadgeClass = (priority: Task['priority']) => {
    switch(priority) {
      case 'High': return 'bg-red-500 text-white hover:bg-red-600';
      case 'Medium': return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'Low': return 'bg-gray-500 text-white hover:bg-gray-600';
      default: return 'bg-gray-400 text-white';
    }
}


export default function DashboardPage({
  initialTasks,
  currentUser,
}: DashboardPageProps) {
  console.log('DashboardPage rendering with tasks:', initialTasks?.length, 'user:', currentUser?.role);

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to get task ID (handles both _id and id fields)
  const getTaskId = (task: any) => task._id || task.id;

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

  // Helper function to safely render vertex (handles both string and object)
  const getVertexName = (vertex: any) => {
    if (typeof vertex === 'string') {
      return vertex;
    }
    if (typeof vertex === 'object' && vertex !== null) {
      return vertex.name || vertex.email || vertex._id || 'Unknown Vertex';
    }
    return 'Unknown Vertex';
  };

  // Helper function to get vertex identifier for comparisons
  const getVertexId = (vertex: any) => {
    if (typeof vertex === 'string') {
      return vertex;
    }
    if (typeof vertex === 'object' && vertex !== null) {
      return vertex._id || vertex.name || vertex.email || 'unknown';
    }
    return 'unknown';
  };
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [selectedVertex, setSelectedVertex] = useState<Vertices | 'all'>('all');
  const [vertices, setVertices] = useState<string[]>(MOCK_VERTICES);
  const [clients, setClients] = useState<ClientStakeholder[]>(INITIAL_MOCK_CLIENTS);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [isCostEstimationOpen, setIsCostEstimationOpen] = useState(false);
  const [isCostVisible, setIsCostVisible] = useState(false);
  const [selectedVertexForDetails, setSelectedVertexForDetails] = useState<string | null>(null);
  const { toast } = useToast();
  
  const isAdmin = currentUser.role === 'admin';
  const isClient = currentUser.role === 'client';

  const clientVertex = useMemo(() => {
    if (isClient) {
      const clientData = clients.find(c => c.email === currentUser.email);
      return clientData?.vertex;
    }
    return undefined;
  }, [isClient, currentUser.email, clients]);
  
  useEffect(() => {
    if (clientVertex) {
      setSelectedVertex(clientVertex);
    } else if (!isClient) {
      // Reset if user is not a client
      setSelectedVertex('all');
    }
  }, [clientVertex, isClient]);


  useEffect(() => {
    const handleStorageChange = () => {
      const storedTasks = sessionStorage.getItem('tasks');
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      
      const storedVertices = sessionStorage.getItem('vertices');
      if (storedVertices) setVertices(JSON.parse(storedVertices));

      const storedClients = sessionStorage.getItem('clients');
      if (storedClients) setClients(JSON.parse(storedClients));
    };
    window.addEventListener('tasksChanged', handleStorageChange);
    window.addEventListener('verticesChanged', handleStorageChange);
    window.addEventListener('clientsChanged', handleStorageChange);

    handleStorageChange();

    return () => {
        window.removeEventListener('tasksChanged', handleStorageChange);
        window.removeEventListener('verticesChanged', handleStorageChange);
        window.removeEventListener('clientsChanged', handleStorageChange);
    };
  }, []);
  
  const dateFilteredTasks = useMemo(() => {
     return tasks.filter((task) => {
      const taskStartDate = new Date(task.startDate);
      const matchesMonth =
        selectedMonth === 'all' ||
        taskStartDate.getMonth() + 1 === selectedMonth;
      const matchesYear =
        selectedYear === 'all' || taskStartDate.getFullYear() === selectedYear;

      return matchesMonth && matchesYear;
    });
  }, [tasks, selectedMonth, selectedYear]);


  const filteredAndSortedTasks = useMemo(() => {
    const finalVertex = clientVertex || selectedVertex;

    let filtered = dateFilteredTasks;

    if (finalVertex && finalVertex !== 'all') {
      filtered = filtered.filter(task => getVertexId(task.vertex) === finalVertex);
    }
    
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((task) =>
        task.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        getAssignedToName(task.assignedTo).toLowerCase().includes(lowerCaseSearchTerm) ||
        getClientName(task.client).toLowerCase().includes(lowerCaseSearchTerm) ||
        getVertexName(task.vertex).toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    return filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [dateFilteredTasks, searchTerm, selectedVertex, clientVertex]);
  
  
   const costByVertex = useMemo(() => {
    const costs: Record<string, number> = {};
    vertices.forEach(v => costs[v] = 0);

    dateFilteredTasks.forEach(task => {
        // Use estimatedCost if available, otherwise calculate from hours and rate
        const cost = task.estimatedCost ??
                    ((task.actualWorkingHours || task.workingHours) * (COST_RATES[task.typeOfWork] || 0));
        if (costs[task.vertex] !== undefined) {
            costs[task.vertex] += cost;
        }
    });

    return costs;
  }, [dateFilteredTasks, vertices]);

  const totalCost = useMemo(() => {
    if(clientVertex) {
        return costByVertex[clientVertex] || 0;
    }
    return Object.values(costByVertex).reduce((acc, cost) => acc + cost, 0);
  }, [costByVertex, clientVertex]);

  // Detailed breakdown by vertex with individual task costs
  const vertexTaskBreakdown = useMemo(() => {
    const breakdown: Record<string, { tasks: Array<{ task: Task; cost: number }>; totalCost: number }> = {};
    vertices.forEach(v => breakdown[v] = { tasks: [], totalCost: 0 });

    dateFilteredTasks.forEach(task => {
      // Use estimatedCost if available, otherwise calculate from hours and rate
      const cost = task.estimatedCost ??
                  ((task.actualWorkingHours || task.workingHours) * (COST_RATES[task.typeOfWork] || 0));
      if (breakdown[task.vertex]) {
        breakdown[task.vertex].tasks.push({ task, cost });
        breakdown[task.vertex].totalCost += cost;
      }
    });

    return breakdown;
  }, [dateFilteredTasks, vertices]);

  const tasksByVertex = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    vertices.forEach(v => grouped[v] = []);

    for (const task of filteredAndSortedTasks) {
        if(grouped[task.vertex]) {
            grouped[task.vertex].push(task);
        }
    }
    
    if(clientVertex) {
        return {[clientVertex]: grouped[clientVertex] || []};
    }
    if (selectedVertex !== 'all') {
        return {[selectedVertex]: grouped[selectedVertex] || []}
    }

    return grouped;
  }, [filteredAndSortedTasks, vertices, selectedVertex, clientVertex]);
  
  const noTasksFound = useMemo(() => {
    return Object.values(tasksByVertex).every(taskList => taskList.length === 0);
  }, [tasksByVertex]);

  const handleShare = () => {
    const shareId = `share-${Date.now()}`;
    const shareData = {
      tasks: filteredAndSortedTasks,
      filters: {
        selectedMonth,
        selectedYear,
        selectedVertex,
        searchTerm,
      },
      layout,
      tasksByVertex,
      costByVertex,
      totalCost,
    };
    sessionStorage.setItem(shareId, JSON.stringify(shareData));
    const shareUrl = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: 'Link Copied!',
        description: 'Dashboard share link copied to clipboard.',
      });
    });
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Gradient Design */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                Project Dashboard
              </h1>
              <p className="text-red-700 dark:text-red-300 mt-1">
                Manage and track all your projects, tasks, and team activities across vertices
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600">{filteredAndSortedTasks.length}</div>
              <div className="text-xs text-muted-foreground">Active Tasks</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-rose-600">{Object.keys(tasksByVertex).length}</div>
              <div className="text-xs text-muted-foreground">Active Vertices</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Estimation Section */}
      {(isAdmin || isClient) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <IndianRupee className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Cost Overview</CardTitle>
                  <CardDescription>
                    Real-time cost estimation for filtered tasks
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCostVisible(!isCostVisible)}
                className="flex items-center gap-2"
              >
                {isCostVisible ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {isCostVisible && (
            <CardContent>
              <div className="space-y-4">
                {/* Quick Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(costByVertex)
                    .filter(([vertex, cost]) => {
                      if (clientVertex && clientVertex !== vertex) return false;
                      if (cost === 0 && !clientVertex) return false;
                      if (selectedVertex !== 'all' && vertex !== selectedVertex) return false;
                      return true;
                    })
                    .slice(0, 3)
                    .map(([vertex, cost]) => (
                      <div
                        key={vertex}
                        className="bg-gradient-to-r from-secondary/50 to-secondary/30 rounded-lg p-4 border cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                        onClick={() => setSelectedVertexForDetails(selectedVertexForDetails === vertex ? null : vertex)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{vertex}</p>
                            <p className="text-lg font-bold">₹{(cost / 1000).toFixed(0)}K</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {vertexTaskBreakdown[vertex]?.tasks.length || 0} tasks
                            </p>
                          </div>
                          <IndianRupee className="h-5 w-5 text-primary/60" />
                        </div>
                      </div>
                    ))
                  }
                  {!clientVertex && (
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-primary">Total Cost</p>
                          <p className="text-lg font-bold text-primary">₹{(totalCost / 100000).toFixed(1)}L</p>
                        </div>
                        <IndianRupee className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Detailed Breakdown */}
                {selectedVertexForDetails && vertexTaskBreakdown[selectedVertexForDetails] && (
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        {selectedVertexForDetails} - Task Breakdown
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedVertexForDetails(null)}
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {vertexTaskBreakdown[selectedVertexForDetails].tasks
                        .sort((a, b) => b.cost - a.cost)
                        .map(({ task, cost }, index) => (
                          <div
                            key={getTaskId(task)}
                            className="flex items-start justify-between p-4 bg-background rounded-md border hover:shadow-sm transition-shadow"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm text-foreground truncate">
                                {task.name}
                              </p>
                              <div className="flex flex-col gap-1 mt-2">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {task.typeOfWork}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {task.actualWorkingHours || task.workingHours}h
                                  </span>
                                  <span>
                                    {task.estimatedCost ?
                                      `Est: ₹${task.estimatedCost}` :
                                      `@₹${COST_RATES[task.typeOfWork]}/h`
                                    }
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <CalendarPlus className="h-3 w-3" />
                                    Created: {format(parseISO(task.createdDate), 'MMM d, yyyy')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CalendarCheck className="h-3 w-3" />
                                    Due: {format(parseISO(task.endDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4 min-w-[100px]">
                              <p className="font-semibold text-sm">₹{cost.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">
                                {((cost / vertexTaskBreakdown[selectedVertexForDetails].totalCost) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">Total for {selectedVertexForDetails}:</span>
                        <span className="font-bold text-lg text-primary">
                          ₹{vertexTaskBreakdown[selectedVertexForDetails].totalCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Controls Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Search className="h-5 w-5" />
                Dashboard Controls
              </CardTitle>
              <CardDescription>Search, filter, and customize your view</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={layout === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayout('grid')}
                  className={cn(
                    "flex items-center gap-2 h-8 px-3",
                    layout === 'grid' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </Button>
                <Button
                  variant={layout === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayout('list')}
                  className={cn(
                    "flex items-center gap-2 h-8 px-3",
                    layout === 'list' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                  )}
                >
                  <List className="h-4 w-4" />
                  List
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2 h-8"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search tasks, clients, or assignees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 text-base"
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vertex</label>
                <Select
                  onValueChange={(val) => setSelectedVertex(val as Vertices | 'all')}
                  value={String(selectedVertex)}
                  disabled={isClient}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Vertices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vertices</SelectItem>
                    {vertices.map((vertex) => (
                      <SelectItem key={vertex} value={String(vertex)}>
                        {vertex}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select
                  onValueChange={(val) => setSelectedMonth(val === 'all' ? 'all' : parseInt(val))}
                  value={String(selectedMonth)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {getMonths().map((month) => (
                      <SelectItem key={month.id} value={String(month.value)}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select
                  onValueChange={(val) => setSelectedYear(val === 'all' ? 'all' : parseInt(val))}
                  value={String(selectedYear)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {getYears().map((year) => (
                      <SelectItem key={year.id} value={String(year.value)}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Display Section */}
      {layout === 'grid' ? (
        <div>
          {noTasksFound ? (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Tasks Found</h3>
                  <p className="text-muted-foreground">
                    No tasks match your current filter criteria. Try adjusting your filters.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Tasks Summary Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Briefcase className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Tasks by Vertex</h2>
                        <p className="text-muted-foreground">Organized task view across all vertices</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary">{filteredAndSortedTasks.length}</p>
                      <p className="text-sm text-muted-foreground">Total Tasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Separate Column for Each Vertex */}
              <div className="space-y-6">
                {vertices
                  .filter(vertex => {
                    if (selectedVertex !== 'all' && vertex !== selectedVertex) return false;
                    return true; // Show all vertices based on static vertices list
                  })
                  .map(vertex => {
                    const tasksForVertex = tasksByVertex[vertex] || []; // Always use empty array if no tasks
                    const completedTasks = tasksForVertex.filter(t => t.status === 'Delivered').length;
                    const inProgressTasks = tasksForVertex.filter(t => t.status === 'In Progress').length;
                    const pendingTasks = tasksForVertex.filter(t => t.status === 'Not Started').length;
                    const onHoldTasks = tasksForVertex.filter(t => t.status === 'On Hold').length;

                    return (
                      <Card key={vertex} className="overflow-hidden">
                        {/* Vertex Header */}
                        <CardHeader className={cn('pb-4', vertexColorClasses[vertex as Vertices] || 'bg-gray-100 border-gray-200 dark:bg-gray-900/30 dark:border-gray-800')}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CardTitle className="text-xl font-bold">{vertex}</CardTitle>
                              <Badge variant="secondary" className="bg-white/30 backdrop-blur-sm">
                                {tasksForVertex.length} tasks
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-lg font-bold">{completedTasks}</p>
                                <p className="text-xs opacity-80">Completed</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold">{inProgressTasks}</p>
                                <p className="text-xs opacity-80">In Progress</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold">{pendingTasks}</p>
                                <p className="text-xs opacity-80">Pending</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold">{onHoldTasks}</p>
                                <p className="text-xs opacity-80">On Hold</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        {/* Tasks Content */}
                        <CardContent className="p-6">
                          {tasksForVertex.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {tasksForVertex.map(task => (
                                <TaskCard key={getTaskId(task)} task={task} currentUser={currentUser} />
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Briefcase className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <h3 className="text-lg font-semibold mb-2">No Tasks Available</h3>
                              <p className="text-muted-foreground">
                                {selectedMonth !== 'all' || selectedYear !== 'all' || searchTerm
                                  ? `No tasks found in ${vertex} for the selected filters`
                                  : `No tasks are currently assigned to ${vertex}`
                                }
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Tasks List View</CardTitle>
                <CardDescription>
                  Detailed table view of all filtered tasks
                </CardDescription>
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredAndSortedTasks.length} task{filteredAndSortedTasks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Task Details</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead className="w-[15%]">Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTasks.length > 0 ? (
                    filteredAndSortedTasks.map(task => (
                      <TableRow key={getTaskId(task)} className={cn('hover:bg-muted/50', vertexColorClasses[getVertexName(task.vertex) as Vertices]?.replace(/ text-\w+-\d+/g, '').replace(/bg-\w+-\d+/g, 'bg-opacity-5') || '')}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{task.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getVertexName(task.vertex)}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', getPriorityBadgeClass(task.priority))}>
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{getClientName(task.client)}</TableCell>
                        <TableCell>{getAssignedToName(task.assignedTo)}</TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(task.startDate), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(task.endDate), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Progress value={task.progress} className="h-2 flex-1" />
                              <span className="text-xs font-medium w-8">{task.progress}%</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={task.status === 'Delivered' ? 'default' : 'secondary'}
                            className={cn(task.status === 'Delivered' && 'bg-green-600 hover:bg-green-700')}
                          >
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Link href={`/task/${getTaskId(task)}`}>
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">View Task Details</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32">
                        <div className="text-center">
                          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                            <Search className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground">No tasks match your filter criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
