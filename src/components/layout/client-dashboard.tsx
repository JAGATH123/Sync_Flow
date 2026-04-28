'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User, Task } from '@/types';
import { MOCK_TASKS } from '@/lib/mock-data';
import { useRealtime } from '@/lib/realtime';
import {
  Eye,
  FileText,
  BarChart3,
  Clock as ClockIcon,
  Home,
  ArrowLeft,
  MessageSquare,
  TrendingUp,
  Building,
} from 'lucide-react';
import Clock from '@/components/layout/clock';
import { cn } from '@/lib/utils';
import UserMenu from '@/components/layout/user-menu';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import Notifications from '@/components/layout/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { COST_RATES } from '@/lib/constants';
import BroadcastMessages from '@/features/broadcasting/components/broadcast-messages';
import BroadcastingPage from '@/features/broadcasting/components/broadcasting-page';

type ClientView = 'my-projects' | 'project-status' | 'reports';

interface ClientDashboardProps {
  currentUser: any; // AuthUser from context
}

export default function ClientDashboard({ currentUser: authUser }: ClientDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ClientView>('my-projects');
  const [viewHistory, setViewHistory] = useState<ClientView[]>(['my-projects']);
  const [myProjects, setMyProjects] = useState<Task[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn('No token found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/tasks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        console.warn('Token expired, clearing auth and redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.tasks) {
          // Convert API tasks to frontend format
          const formattedTasks = result.tasks.map((task: any) => ({
            ...task,
            id: task._id,
            assignedTo: task.assignedToName || task.assignedTo?.name || task.assignedTo,
            startDate: task.startDate?.split('T')[0] || task.startDate,
            endDate: task.endDate?.split('T')[0] || task.endDate,
            createdDate: task.createdDate?.split('T')[0] || task.createdDate,
            completionDate: task.completionDate ? task.completionDate.split('T')[0] : undefined
          }));

          setTasks(formattedTasks);

          // Filter tasks for current client based on vertex, email, or client name
          if (authUser) {
            const clientTasks = formattedTasks.filter((task: any) =>
              task.vertex === authUser.vertex ||
              task.clientEmail === authUser.email ||
              (task.client && authUser.name && task.client.toLowerCase().includes(authUser.name.toLowerCase()))
            );
            setMyProjects(clientTasks);
          }
        }
      } else {
        console.error('Failed to fetch tasks:', response.status);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [authUser]);

  useEffect(() => {
    // Convert auth user to User type for compatibility
    if (authUser) {
      const user: User = {
        name: authUser.name,
        email: authUser.email,
        role: authUser.role
      };
      setCurrentUser(user);

      // Fetch tasks from API
      fetchTasks();
    }
  }, [authUser]);

  // Subscribe to real-time task updates
  useEffect(() => {
    const unsubscribe1 = useRealtime('task_created', (event) => {
      console.log('Task created event received in client dashboard:', event);
      fetchTasks(); // Refresh tasks when a new task is created
    });

    const unsubscribe2 = useRealtime('task_updated', (event) => {
      console.log('Task updated event received in client dashboard:', event);
      fetchTasks(); // Refresh tasks when a task is updated
    });

    return () => {
      if (typeof unsubscribe1 === 'function') unsubscribe1();
      if (typeof unsubscribe2 === 'function') unsubscribe2();
    };
  }, [fetchTasks]);

  const handleSetView = (view: ClientView) => {
    setViewHistory(prev => [...prev, view]);
    setActiveView(view);
  }

  const handleBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop();
      const previousView = newHistory[newHistory.length - 1];
      setViewHistory(newHistory);
      setActiveView(previousView);
    }
  }

  const getStatusBadgeClass = (status: Task['status']) => {
    switch(status) {
      case 'Delivered': return 'bg-green-500 text-white';
      case 'In Progress': return 'bg-blue-500 text-white';
      case 'On Hold': return 'bg-yellow-500 text-black';
      case 'Not Started': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getPriorityBadgeClass = (priority: Task['priority']) => {
    switch(priority) {
      case 'High': return 'bg-red-500 text-white hover:bg-red-600';
      case 'Medium': return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'Low': return 'bg-gray-500 text-white hover:bg-gray-600';
      default: return 'bg-gray-400 text-white';
    }
  };

  const calculateProjectCost = (task: Task) => {
    const rate = COST_RATES[task.typeOfWork] || 0;
    return (task.actualWorkingHours || task.workingHours) * rate;
  };

  const renderMyProjects = () => (
    <div className="space-y-6">
      {/* Broadcast Messages */}
      <BroadcastMessages userRole="client" userName={currentUser?.name} />

      {/* Enhanced Header with Gradient Design */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-xl p-6 border border-cyan-200 dark:border-cyan-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
              <Eye className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                My Projects
              </h1>
              <p className="text-cyan-700 dark:text-cyan-300 mt-1">
                Projects and tasks related to your organization
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-cyan-200 dark:border-cyan-800">
              <div className="text-2xl font-bold text-cyan-600">{myProjects.length}</div>
              <div className="text-xs text-muted-foreground">Total Projects</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-cyan-200 dark:border-cyan-800">
              <div className="text-2xl font-bold text-blue-600">{myProjects.filter(p => p.status === 'Delivered').length}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {myProjects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground">No projects are currently associated with your account.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {myProjects.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-lg">{task.name}</CardTitle>
                    <CardDescription>{task.category}</CardDescription>
                    <div className="flex gap-2">
                      <Badge className={cn('text-xs', getPriorityBadgeClass(task.priority))}>
                        {task.priority} Priority
                      </Badge>
                      <Badge className={cn('text-xs', getStatusBadgeClass(task.status))}>
                        {task.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.typeOfWork}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Cost</p>
                    <p className="text-lg font-bold">₹{calculateProjectCost(task).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Assigned To:</span>
                      <p className="font-medium">{task.assignedTo}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vertex:</span>
                      <p className="font-medium">{task.vertex}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Start Date:</span>
                      <p className="font-medium">{format(parseISO(task.startDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due Date:</span>
                      <p className="font-medium">{format(parseISO(task.endDate), 'MMM d, yyyy')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Estimated Hours:</span>
                      <p className="font-medium">{task.workingHours}h</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actual Hours:</span>
                      <p className="font-medium">{task.actualWorkingHours || 0}h</p>
                    </div>
                  </div>

                  {task.remarks && (
                    <div>
                      <span className="text-muted-foreground text-sm">Remarks:</span>
                      <p className="text-sm bg-secondary/50 p-2 rounded mt-1">{task.remarks}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderProjectStatus = () => {
    const completedProjects = myProjects.filter(task => task.status === 'Delivered').length;
    const inProgressProjects = myProjects.filter(task => task.status === 'In Progress').length;
    const onHoldProjects = myProjects.filter(task => task.status === 'On Hold').length;
    const notStartedProjects = myProjects.filter(task => task.status === 'Not Started').length;
    const totalCost = myProjects.reduce((sum, task) => sum + calculateProjectCost(task), 0);
    const avgProgress = myProjects.length > 0 ? Math.round(myProjects.reduce((sum, task) => sum + task.progress, 0) / myProjects.length) : 0;

    return (
      <div className="space-y-6">
        {/* Enhanced Header with Gradient Design */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Project Status
                </h1>
                <p className="text-orange-700 dark:text-orange-300 mt-1">
                  Overview of all your project statuses and progress
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-orange-600">{avgProgress}%</div>
                <div className="text-xs text-muted-foreground">Avg Progress</div>
              </div>
              <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-2xl font-bold text-red-600">₹{totalCost.toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{inProgressProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">On Hold</p>
                  <p className="text-2xl font-bold">{onHoldProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Not Started</p>
                  <p className="text-2xl font-bold">{notStartedProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-bold">{avgProgress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold">₹{totalCost.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-6">
      {/* Enhanced Header with Gradient Design */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Project Reports
              </h1>
              <p className="text-emerald-700 dark:text-emerald-300 mt-1">
                Detailed reports and analytics for your projects
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="text-2xl font-bold text-emerald-600">{myProjects.length}</div>
              <div className="text-xs text-muted-foreground">Total Reports</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="text-2xl font-bold text-teal-600">{myProjects.filter(p => p.status === 'Delivered').length}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Summary</CardTitle>
          <CardDescription>Detailed breakdown of all your projects</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myProjects.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="text-sm text-muted-foreground">{task.category}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', getStatusBadgeClass(task.status))}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={task.progress} className="h-2 w-16" />
                      <span className="text-sm font-medium">{task.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{task.assignedTo}</TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{calculateProjectCost(task).toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch(activeView) {
      case 'my-projects':
        return renderMyProjects();
      case 'project-status':
        return renderProjectStatus();
      case 'reports':
        return renderReports();
      default:
        return renderMyProjects();
    }
  }

  // Don't render if currentUser is not loaded yet
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Loading client dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon">
         <SidebarHeader>
           <div className="flex justify-between items-center p-4">
              <div className="w-32 group-data-[collapsible=icon]:hidden">
                 <h2 className="text-2xl font-bold tracking-wider text-sidebar-foreground">SyncFlow</h2>
              </div>
              <SidebarTrigger />
           </div>
           <div className="px-4 pb-4 group-data-[collapsible=icon]:hidden">
             <div className="h-px bg-border"></div>
           </div>
         </SidebarHeader>
         <SidebarContent>
           <SidebarMenu className="gap-1 px-2">
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('my-projects')} isActive={activeView === 'my-projects'} tooltip="My Projects">
                <Eye />
                <span>My Projects</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('project-status')} isActive={activeView === 'project-status'} tooltip="Project Status">
                <BarChart3 />
                <span>Project Status</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('reports')} isActive={activeView === 'reports'} tooltip="Reports">
                <FileText />
                <span>Reports</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
         </SidebarContent>
         <SidebarFooter>
            <div className="p-4 group-data-[collapsible=icon]:hidden">
              <div className="flex flex-col items-center justify-center space-y-3">
                <p className="text-sm font-bold text-muted-foreground tracking-widest uppercase font-orbitron">Developed By</p>
                <img
                  src="/LOF_alternate.png"
                  alt="LOF Logo"
                  className="h-12 w-auto object-contain"
                />
              </div>
            </div>
         </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="w-full p-4 sm:p-6">
          <header className="flex justify-between items-center mb-6">
            <Clock />
            <div className="flex items-center gap-4">
              <Notifications />
              <UserMenu />
            </div>
          </header>
           <div>
              {renderContent()}
            </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}