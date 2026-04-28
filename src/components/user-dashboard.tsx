'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User, Task } from '@/types';
import { MOCK_TASKS } from '@/lib/mock-data';
import {
  LayoutDashboard,
  CheckSquare,
  Clock as ClockIcon,
  User as UserIcon,
  Home,
  ArrowLeft,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  Filter,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Timer,
  Target,
} from 'lucide-react';
import Clock from './clock';
import { cn } from '@/lib/utils';
import UserMenu from './user-menu';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset } from './ui/sidebar';
import Notifications from './notifications';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import BroadcastMessages from './broadcast-messages';
import BroadcastingPage from './broadcasting-page';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";
import { useRealtime, emitTaskUpdated } from '@/lib/realtime';

type UserView = 'my-tasks' | 'my-progress' | 'team-chat';

interface UserDashboardProps {
  currentUser: any; // AuthUser from context
}

export default function UserDashboard({ currentUser: authUser }: UserDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<UserView>('my-tasks');
  const [viewHistory, setViewHistory] = useState<UserView[]>(['my-tasks']);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editActualHours, setEditActualHours] = useState<number>(0);

  // Helper function to get task ID (handles both _id and id fields)
  const getTaskId = (task: any) => task._id || task.id;

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

          // Filter tasks assigned to current user
          if (authUser) {
            const userTasks = formattedTasks.filter((task: any) => {
              // Handle both string and object assignedTo field
              const assignedToName = typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?.name;
              const assignedToEmail = typeof task.assignedTo === 'object' ? task.assignedTo?.email : task.assigneeEmail;

              return assignedToName === authUser.name ||
                     assignedToEmail === authUser.email ||
                     task.assigneeEmail === authUser.email;
            });
            setMyTasks(userTasks);
          }
        }
      } else {
        console.error('Failed to fetch tasks:', response.status);
        if (authUser) {
          const userTasks = mockTasks.filter((task: Task) =>
            task.assignedTo === authUser.name || task.assigneeEmail === authUser.email
          );
          setMyTasks(userTasks);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Fallback to mock data
      const mockTasks = MOCK_TASKS;
      setTasks(mockTasks);
      if (authUser) {
        const userTasks = mockTasks.filter((task: Task) =>
          task.assignedTo === authUser.name || task.assigneeEmail === authUser.email
        );
        setMyTasks(userTasks);
      }
    }
  }, []);

  useEffect(() => {
    // Convert auth user to User type for compatibility
    if (authUser) {
      const user: User = {
        name: authUser.name,
        email: authUser.email,
        role: authUser.role
      };
      setCurrentUser(user);
    }

    // Fetch tasks from API
    fetchTasks();
  }, [authUser]);

  // Listen for real-time task events
  useEffect(() => {
    const unsubscribe1 = useRealtime('task_created', (event) => {
      console.log('Task created event received:', event);
      fetchTasks(); // Re-fetch tasks when new task is created
    });

    const unsubscribe2 = useRealtime('task_updated', (event) => {
      console.log('Task updated event received:', event);
      fetchTasks(); // Re-fetch tasks when task is updated
    });

    return () => {
      if (typeof unsubscribe1 === 'function') unsubscribe1();
      if (typeof unsubscribe2 === 'function') unsubscribe2();
    };
  }, [fetchTasks]);

  const handleSetView = (view: UserView) => {
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

  const handleEditProgress = (task: Task) => {
    setEditingTask(task);
    setEditProgress(task.progress || 0);
    setEditActualHours(task.actualWorkingHours || 0);
  };

  const handleSaveProgress = async () => {
    if (editingTask) {
      await updateTaskProgress(getTaskId(editingTask), editProgress, editActualHours);
      setEditingTask(null);
      setEditProgress(0);
      setEditActualHours(0);
    }
  };

  const updateTaskProgress = async (taskId: string, progress: number, actualHours?: number) => {
    try {
      const token = localStorage.getItem('token');

      // Determine status based on progress
      let status = '';
      if (progress === 100) {
        status = 'Delivered';
      } else if (progress > 0) {
        status = 'In Progress';
      }

      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          taskId,
          progress,
          actualWorkingHours: actualHours,
          status: status || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update local state immediately for better UX
        const updatedTasks = tasks.map(task => {
          if (getTaskId(task) === taskId) {
            return { ...task, progress, status: (status || task.status) as Task['status'] };
          }
          return task;
        });
        setTasks(updatedTasks);

        // Update myTasks as well
        const userTasks = updatedTasks.filter((task: any) => {
          // Handle both string and object assignedTo field
          const assignedToName = typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?.name;
          const assignedToEmail = typeof task.assignedTo === 'object' ? task.assignedTo?.email : task.assigneeEmail;

          return assignedToName === authUser?.name ||
                 assignedToEmail === authUser?.email ||
                 task.assigneeEmail === authUser?.email;
        });
        setMyTasks(userTasks);

        // Emit real-time event
        emitTaskUpdated(result.task);

        console.log('Task updated successfully:', result.task);
      } else {
        const error = await response.json();
        console.error('Failed to update task:', error);
        alert('Failed to update task: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task. Please try again.');
    }
  };

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
      case 'Urgent': return 'bg-red-600 text-white hover:bg-red-700';
      case 'High': return 'bg-red-500 text-white hover:bg-red-600';
      case 'Medium': return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'Low': return 'bg-gray-500 text-white hover:bg-gray-600';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getPriorityIcon = (priority: Task['priority']) => {
    switch(priority) {
      case 'Urgent': return <AlertCircle className="h-4 w-4" />;
      case 'High': return <TrendingUp className="h-4 w-4" />;
      case 'Medium': return <Target className="h-4 w-4" />;
      case 'Low': return <CheckCircle2 className="h-4 w-4" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch(status) {
      case 'Delivered': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'In Progress': return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case 'On Hold': return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      case 'Not Started': return <ClockIcon className="h-4 w-4 text-gray-500" />;
      default: return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTasks = myTasks.filter(task => {
    // Handle both string and object client field
    const clientName = typeof task.client === 'string' ? task.client : (task.client as any)?.name || '';

    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getTaskStats = () => {
    const total = myTasks.length;
    const completed = myTasks.filter(task => task.status === 'Delivered').length;
    const inProgress = myTasks.filter(task => task.status === 'In Progress').length;
    const overdue = myTasks.filter(task => {
      const endDate = new Date(task.endDate);
      const today = new Date();
      return endDate < today && task.status !== 'Delivered';
    }).length;

    return { total, completed, inProgress, overdue };
  };

  const taskStats = getTaskStats();

  const renderMyTasks = () => (
    <div className="space-y-6">
      {/* Broadcast Messages */}
      <BroadcastMessages userRole="user" userName={currentUser?.name} />

      {/* Enhanced Header with Gradient Design */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl shadow-lg">
              <CheckSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                My Tasks
              </h1>
              <p className="text-green-700 dark:text-green-300 mt-1">
                Manage your assigned tasks and track progress efficiently
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600">{taskStats.total}</div>
              <div className="text-xs text-muted-foreground">Total Tasks</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-blue-600">{taskStats.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <PlayCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{taskStats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-purple-600">{taskStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {myTasks.length === 0 ? "No tasks assigned" : "No tasks match your filters"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {myTasks.length === 0
                ? "You don't have any tasks assigned to you yet. Check back later or contact your manager."
                : "Try adjusting your search terms or filters to find the tasks you're looking for."
              }
            </p>
            {myTasks.length > 0 && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredTasks.map((task) => {
            const isOverdue = new Date(task.endDate) < new Date() && task.status !== 'Delivered';
            const daysUntilDue = Math.ceil((new Date(task.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));

            return (
              <Card key={getTaskId(task)} className={cn(
                "hover:shadow-lg transition-all duration-200 border-l-4",
                isOverdue ? "border-l-red-500" : "border-l-blue-500"
              )}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{task.name}</CardTitle>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        {task.category} • {typeof task.client === 'string' ? task.client : (task.client as any)?.name || 'Unknown Client'}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={cn('text-xs flex items-center gap-1', getPriorityBadgeClass(task.priority))}>
                          {getPriorityIcon(task.priority)}
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          {getStatusIcon(task.status)}
                          {task.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {task.vertex}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.typeOfWork}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Edit Progress"
                      onClick={() => handleEditProgress(task)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progress Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Progress</span>
                      </div>
                      <span className="text-sm font-bold">{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-3" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskProgress(getTaskId(task), Math.min(100, task.progress + 25))}
                        disabled={task.progress >= 100}
                        className="text-xs"
                      >
                        +25%
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskProgress(getTaskId(task), Math.min(100, task.progress + 10))}
                        disabled={task.progress >= 100}
                        className="text-xs"
                      >
                        +10%
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateTaskProgress(getTaskId(task), 100)}
                        disabled={task.progress >= 100}
                        className="text-xs"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Task Details Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Start Date</span>
                      </div>
                      <p className="font-medium">{format(parseISO(task.startDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Due Date</span>
                      </div>
                      <p className={cn("font-medium", isOverdue ? "text-red-600" : "")}>
                        {format(parseISO(task.endDate), 'MMM d, yyyy')}
                        {daysUntilDue > 0 && !isOverdue && (
                          <span className="text-xs text-muted-foreground block">
                            {daysUntilDue} days left
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Timer className="h-3 w-3" />
                        <span>Estimated</span>
                      </div>
                      <p className="font-medium">{task.workingHours}h</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <ClockIcon className="h-3 w-3" />
                        <span>Logged</span>
                      </div>
                      <p className="font-medium">{task.actualWorkingHours || 0}h</p>
                    </div>
                  </div>

                  {task.remarks && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                          <p className="text-sm font-medium text-muted-foreground">Admin Notes</p>
                        </div>
                        <p className="text-sm bg-blue-50 border border-blue-200 p-3 rounded-md dark:bg-blue-950/20 dark:border-blue-800/30">{task.remarks}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderMyProgress = () => {
    const completedTasks = myTasks.filter(task => task.status === 'Delivered').length;
    const inProgressTasks = myTasks.filter(task => task.status === 'In Progress').length;
    const onHoldTasks = myTasks.filter(task => task.status === 'On Hold').length;
    const notStartedTasks = myTasks.filter(task => task.status === 'Not Started').length;
    const totalHours = myTasks.reduce((sum, task) => sum + (task.actualWorkingHours || 0), 0);
    const estimatedHours = myTasks.reduce((sum, task) => sum + task.workingHours, 0);
    const avgProgress = myTasks.length > 0 ? Math.round(myTasks.reduce((sum, task) => sum + task.progress, 0) / myTasks.length) : 0;
    const efficiency = estimatedHours > 0 ? Math.round((totalHours / estimatedHours) * 100) : 0;

    // Task Status Distribution for Pie Chart
    const statusData = [
      { name: 'Completed', value: completedTasks, color: '#22c55e' },
      { name: 'In Progress', value: inProgressTasks, color: '#3b82f6' },
      { name: 'On Hold', value: onHoldTasks, color: '#eab308' },
      { name: 'Not Started', value: notStartedTasks, color: '#6b7280' }
    ].filter(item => item.value > 0);

    // Priority Distribution
    const priorityData = [
      { name: 'Urgent', value: myTasks.filter(t => t.priority === 'Urgent').length, color: '#dc2626' },
      { name: 'High', value: myTasks.filter(t => t.priority === 'High').length, color: '#ea580c' },
      { name: 'Medium', value: myTasks.filter(t => t.priority === 'Medium').length, color: '#ca8a04' },
      { name: 'Low', value: myTasks.filter(t => t.priority === 'Low').length, color: '#65a30d' }
    ].filter(item => item.value > 0);

    // Work Type Distribution
    const workTypeData = [
      { name: 'Design', value: myTasks.filter(t => t.typeOfWork === 'Design').length },
      { name: 'Development', value: myTasks.filter(t => t.typeOfWork === 'Development').length },
      { name: 'QA', value: myTasks.filter(t => t.typeOfWork === 'QA').length },
      { name: 'Marketing', value: myTasks.filter(t => t.typeOfWork === 'Marketing').length }
    ].filter(item => item.value > 0);

    // Weekly Progress (mock data for demo)
    const weeklyData = eachDayOfInterval({
      start: startOfWeek(new Date()),
      end: endOfWeek(new Date())
    }).map(day => ({
      day: format(day, 'EEE'),
      completed: Math.floor(Math.random() * 3) + 1,
      hours: Math.floor(Math.random() * 6) + 2
    }));

    return (
      <div className="space-y-6">
        {/* Enhanced Header with Gradient Design */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  My Progress
                </h1>
                <p className="text-purple-700 dark:text-purple-300 mt-1">
                  Track your performance and achievements with detailed analytics
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-2xl font-bold text-purple-600">{avgProgress}%</div>
                <div className="text-xs text-muted-foreground">Avg Progress</div>
              </div>
              <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-2xl font-bold text-pink-600">{efficiency}%</div>
                <div className="text-xs text-muted-foreground">Efficiency</div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completedTasks}</p>
                  <p className="text-xs text-muted-foreground">
                    {myTasks.length > 0 ? Math.round((completedTasks / myTasks.length) * 100) : 0}% of total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                  <Timer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hours Logged</p>
                  <p className="text-3xl font-bold text-blue-600">{totalHours}h</p>
                  <p className="text-xs text-muted-foreground">
                    of {estimatedHours}h estimated
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
                  <p className="text-3xl font-bold text-purple-600">{avgProgress}%</p>
                  <p className="text-xs text-muted-foreground">
                    across all tasks
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/30">
                  <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Efficiency</p>
                  <p className="text-3xl font-bold text-orange-600">{efficiency}%</p>
                  <p className="text-xs text-muted-foreground">
                    time utilization
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PauseCircle className="h-5 w-5" />
                Task Status Distribution
              </CardTitle>
              <CardDescription>
                Overview of your task completion status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ChartContainer
                  config={{}}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [`${value} tasks`, '']}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No task data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Priority Breakdown
              </CardTitle>
              <CardDescription>
                Distribution of tasks by priority level
              </CardDescription>
            </CardHeader>
            <CardContent>
              {priorityData.length > 0 ? (
                <ChartContainer
                  config={{}}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [`${value} tasks`, '']}
                      />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No priority data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your latest task updates and progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myTasks.slice(0, 6).map((task) => (
                  <div key={getTaskId(task)} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex-shrink-0">
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{typeof task.client === 'string' ? task.client : (task.client as any)?.name || 'Unknown Client'} • {task.category}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <Badge className={cn('text-xs', getStatusBadgeClass(task.status))}>
                        {task.status}
                      </Badge>
                      <p className="text-sm font-medium mt-1">{task.progress}%</p>
                    </div>
                  </div>
                ))}
                {myTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Insights
              </CardTitle>
              <CardDescription>
                Key insights about your work patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Work Type Distribution */}
                <div>
                  <p className="text-sm font-medium mb-3">Work Type Distribution</p>
                  <div className="space-y-2">
                    {workTypeData.map((type) => {
                      const percentage = myTasks.length > 0 ? Math.round((type.value / myTasks.length) * 100) : 0;
                      return (
                        <div key={type.name} className="flex items-center justify-between">
                          <span className="text-sm">{type.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{type.value}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                    <p className="text-xs text-muted-foreground">Tasks Completed</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </div>

                {/* Motivational Message */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium">Keep it up!</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {avgProgress >= 80
                      ? "Excellent progress! You're doing great on your tasks."
                      : avgProgress >= 50
                      ? "Good momentum! Keep pushing forward on your tasks."
                      : "You've got this! Take it one task at a time."
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };


  const renderTeamChat = () => (
    <BroadcastingPage currentUser={currentUser!} />
  );

  const renderContent = () => {
    switch(activeView) {
      case 'my-tasks':
        return renderMyTasks();
      case 'my-progress':
        return renderMyProgress();
      case 'team-chat':
        return renderTeamChat();
      default:
        return renderMyTasks();
    }
  }

  // Don't render if currentUser is not loaded yet
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Loading user dashboard...</p>
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
              <SidebarMenuButton onClick={() => handleSetView('my-tasks')} isActive={activeView === 'my-tasks'} tooltip="My Tasks">
                <CheckSquare />
                <span>My Tasks</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('my-progress')} isActive={activeView === 'my-progress'} tooltip="My Progress">
                <LayoutDashboard />
                <span>My Progress</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('team-chat')} isActive={activeView === 'team-chat'} tooltip="Team Chat">
                <MessageSquare />
                <span>Team Chat</span>
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

      {/* Edit Progress Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task Progress</DialogTitle>
            <DialogDescription>
              Update your progress and working hours for "{editingTask?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="progress">Progress (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                step="10"
                value={editProgress}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setEditProgress(0);
                  } else {
                    const numValue = parseInt(value, 10);
                    setEditProgress(Math.min(100, Math.max(0, isNaN(numValue) ? 0 : numValue)));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualHours">Actual Working Hours</Label>
              <Input
                id="actualHours"
                type="number"
                min="0"
                max="8"
                step="0.5"
                value={editActualHours}
                onChange={(e) => setEditActualHours(Math.min(8, Math.max(0, parseFloat(e.target.value) || 0)))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTask(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProgress}>
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}