
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { User, Task, TaskStatus, Vertices, ReviewStatus, TaskPriority, TeamMember, AppNotification } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Calendar, CheckCircle, Clock, IndianRupee, Trash2, Search, Save, RotateCcw, ListChecks, LayoutGrid, List } from 'lucide-react';
import CreateTaskDialog from './create-task-dialog';
import AddVertexDialog from './add-vertex-dialog';
import DeleteVertexDialog from './delete-vertex-dialog';
import { format, parseISO, isBefore, isEqual as isDateEqual } from 'date-fns';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { COST_RATES, TASK_STATUSES, REVIEW_STATUSES, TASK_PRIORITIES } from '@/lib/constants';
import { MOCK_VERTICES, TEAM_MEMBERS as INITIAL_TEAM_MEMBERS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { isEqual, omit } from 'lodash';
import { useToast } from '@/hooks/use-toast';
import { emitTaskUpdated } from '@/lib/realtime';

interface TaskManagementPageProps {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string | string[]) => void;
  currentUser: User;
}


export default function TaskManagementPage({
  tasks,
  addTask,
  updateTask,
  deleteTask,
  currentUser,
}: TaskManagementPageProps) {
  const isAdmin = currentUser.role === 'admin';
  const isClient = currentUser.role === 'client';
  const { toast } = useToast();

  // Helper function to get task ID (handles both id and _id)
  const getTaskId = (task: any) => task._id || task.id;
  
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isBulkDeleteConfirming, setIsBulkDeleteConfirming] = useState(false);
  
  const [vertexFilter, setVertexFilter] = useState<Vertices | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editedTasks, setEditedTasks] = useState<Record<string, Partial<Task>>>({});
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null);
  const [taskToSave, setTaskToSave] = useState<Task | null>(null);
  const [vertices, setVertices] = useState<string[]>(MOCK_VERTICES);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    const storedVertices = sessionStorage.getItem('vertices');
    if (storedVertices) {
      setVertices(JSON.parse(storedVertices));
    }

    // Load team members from API
    const loadTeamMembers = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();

        if (data.success && data.users) {
          // Filter to get only users with 'user' role for team assignment
          const userMembers = data.users
            .filter((user: any) => user.role === 'user')
            .map((user: any) => ({
              name: user.name,
              email: user.email,
              role: user.role,
              empId: user.empId || user._id,
              designation: user.designation || 'Team Member'
            }));

          setTeamMembers(userMembers);
        } else {
          // Fallback to mock data if API fails
          setTeamMembers(INITIAL_TEAM_MEMBERS);
        }
      } catch (error) {
        console.error('Failed to load team members:', error);
        // Fallback to mock data if API fails
        setTeamMembers(INITIAL_TEAM_MEMBERS);
      }
    };

    loadTeamMembers();

    const handleDataChange = () => {
      const storedVertices = sessionStorage.getItem('vertices');
      if (storedVertices) setVertices(JSON.parse(storedVertices));
      
      const updatedMembers = sessionStorage.getItem('teamMembers');
      if (updatedMembers) setTeamMembers(JSON.parse(updatedMembers));
    };

    window.addEventListener('verticesChanged', handleDataChange);
    window.addEventListener('teamMembersChanged', handleDataChange);
    return () => {
        window.removeEventListener('verticesChanged', handleDataChange);
        window.removeEventListener('teamMembersChanged', handleDataChange);
    }
  }, []);

  const visibleTasks = useMemo(() => {
    let filteredTasks = isAdmin ? tasks : tasks.filter(task => task.assignedTo === currentUser.name);

    if (vertexFilter !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.vertex === vertexFilter);
    }

    if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filteredTasks = filteredTasks.filter(task =>
            task.name.toLowerCase().includes(lowerCaseSearchTerm) ||
            task.assignedTo.toLowerCase().includes(lowerCaseSearchTerm) ||
            task.client.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }

    return filteredTasks;
  }, [tasks, currentUser, isAdmin, vertexFilter, searchTerm]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedTasks([]);
    setEditedTasks({});
  }, [vertexFilter, currentUser, searchTerm]);

  const calculateApproxCost = (task: Task) => {
    const rate = COST_RATES[task.typeOfWork as keyof typeof COST_RATES] || 0;
    return task.workingHours * rate;
  }
  
  const addNotification = (message: string) => {
    const storedNotifications = sessionStorage.getItem('notifications');
    const notifications: AppNotification[] = storedNotifications ? JSON.parse(storedNotifications) : [];
    
    const newNotification: AppNotification = {
      id: `notif-${Date.now()}`,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updatedNotifications = [newNotification, ...notifications].slice(0, 20); // Keep last 20
    sessionStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    window.dispatchEvent(new Event('notificationsChanged'));
  }


  const handleFieldUpdate = (taskId: string, field: keyof Task, value: any) => {
    const originalTask = tasks.find(t => getTaskId(t) === taskId);
    if (!originalTask) return;
    
    const currentEdits = editedTasks[taskId] || {};
    let updatedEdits = { ...currentEdits, [field]: value };

    // Apply cascading logic for status and progress
    const updatedTaskForLogic = { ...originalTask, ...updatedEdits };

    if (field === 'status') {
      switch (value) {
        case 'Review':
          // When status is set to "Review", keep it as Review
          updatedEdits.status = 'Review';
          updatedEdits.progress = 100;
          if (!updatedTaskForLogic.completionDate) {
            updatedEdits.completionDate = new Date().toISOString().split('T')[0];
          }
          updatedEdits.reviewStatus = 'Signed off';
          break;
        case 'Not Started':
          updatedEdits.progress = 0;
          break;
      }
    }

    if (field === 'progress') {
      const newProgress = Number(value);
      if (newProgress === 100) {
        if (updatedTaskForLogic.status === 'Review') {
            if (!updatedTaskForLogic.completionDate) {
              updatedEdits.completionDate = new Date().toISOString().split('T')[0];
            }
            updatedEdits.reviewStatus = 'Signed off';
        }
      } else if (newProgress > 0 && updatedTaskForLogic.status !== 'On Hold') {
        updatedEdits.status = 'In Progress';
      } else if (newProgress === 0) {
        updatedEdits.status = 'Not Started';
      }
    }
    
    setEditedTasks(prev => ({ ...prev, [taskId]: updatedEdits }));
  };
  
  const handleResetChanges = (taskId: string) => {
    setEditedTasks(prev => omit(prev, taskId));
    setEditingRemarks(null);
  };
  
  const handleSaveClick = (task: Task) => {
    const taskId = getTaskId(task);
    const updatedTask = { ...task, ...editedTasks[taskId] };
    setTaskToSave(updatedTask);
  };
  
  const handleConfirmSave = async () => {
    if (taskToSave) {
      try {
        const taskId = getTaskId(taskToSave);
        const originalTask = tasks.find(t => getTaskId(t) === taskId);
        const changes = editedTasks[taskId] || {};

        const response = await fetch('/api/tasks', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId,
            ...changes
          }),
        });

        const data = await response.json();

        if (response.ok) {
          if(originalTask) {
            if (originalTask.status !== taskToSave.status) {
              addNotification(`Task "${taskToSave.name}" status changed to ${taskToSave.status}.`);
            }
            if (originalTask.reviewStatus !== taskToSave.reviewStatus) {
              addNotification(`Task "${taskToSave.name}" review status changed to ${taskToSave.reviewStatus}.`);
            }
          }

          updateTask(taskToSave);

          // Emit real-time event to notify other users/dashboards
          emitTaskUpdated(data.task || taskToSave);

          handleResetChanges(taskId);
          setTaskToSave(null);
          toast({
            title: 'Task Updated',
            description: `Changes to "${taskToSave.name}" have been saved.`,
          });
        } else {
          toast({
            title: 'Update Failed',
            description: data.error || 'Failed to update task',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Update task error:', error);
        toast({
          title: 'Update Failed',
          description: 'An error occurred while updating the task',
          variant: 'destructive'
        });
      }
    }
  };


  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      try {
        const taskId = getTaskId(taskToDelete);
        const response = await fetch(`/api/tasks?ids=${taskId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (response.ok) {
          deleteTask(taskId);
          toast({
            title: "Task Deleted",
            description: `Task "${taskToDelete.name}" has been permanently deleted.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Delete Failed",
            description: data.error || "Failed to delete task",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Delete task error:', error);
        toast({
          title: "Delete Failed",
          description: "An error occurred while deleting the task",
          variant: "destructive"
        });
      }
      setTaskToDelete(null);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      const response = await fetch(`/api/tasks?ids=${selectedTasks.join(',')}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        deleteTask(selectedTasks);
        toast({
          title: "Bulk Delete Successful",
          description: `${selectedTasks.length} tasks have been permanently deleted.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Bulk Delete Failed",
          description: data.error || "Failed to delete tasks",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Bulk Delete Failed",
        description: "An error occurred while deleting tasks",
        variant: "destructive"
      });
    }
    setSelectedTasks([]);
    setIsBulkDeleteConfirming(false);
  }

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === visibleTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(visibleTasks.map(t => t.id));
    }
  };


  const getCompletionStatus = (task: Task): { text: string; className: string } => {
    if (task.status !== 'Review' || !task.completionDate) {
      return { text: '', className: '' };
    }

    const endDate = parseISO(task.endDate);
    const completionDate = parseISO(task.completionDate);

    if (isBefore(completionDate, endDate)) {
      return { text: 'Early', className: 'bg-blue-500 hover:bg-blue-600' };
    }
    if (isDateEqual(completionDate, endDate)) {
      return { text: 'On Time', className: 'bg-green-500 hover:bg-green-600' };
    }
    return { text: 'Late', className: 'bg-red-500 hover:bg-red-600' };
  };
  
  const canEdit = (task: Task) => {
    // Cannot edit if task is delivered
    if (task.status === 'Delivered') return false;
    // Otherwise check permissions
    return isAdmin || task.assignedTo === currentUser.name;
  };
  
  const getPriorityBadgeClass = (priority: TaskPriority) => {
    switch(priority) {
      case 'High': return 'bg-red-500 text-white hover:bg-red-600';
      case 'Medium': return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'Low': return 'bg-gray-500 text-white hover:bg-gray-600';
      default: return 'bg-gray-400 text-white';
    }
  }

  return (
    <div className="space-y-8 w-full">
      {/* Enhanced Header with Gradient Design */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
              <ListChecks className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Task Management
              </h1>
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                Comprehensive task tracking and workflow management for your projects
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-2xl font-bold text-orange-600">{visibleTasks.length}</div>
              <div className="text-xs text-muted-foreground">Total Tasks</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-2xl font-bold text-amber-600">{visibleTasks.filter(t => t.status === 'Review').length}</div>
              <div className="text-xs text-muted-foreground">In Review</div>
            </div>
          </div>
        </div>
      </div>

      <Card className="w-full h-auto">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-6 w-6" />
                  All Tasks
                </CardTitle>
                <CardDescription>
                  Manage and track all tasks across the organization.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                 <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search task, assignee, client..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                 <div className="flex gap-2">
                   <Select value={vertexFilter} onValueChange={(value) => setVertexFilter(value as Vertices | 'all')}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by vertices..." />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="all">All Vertices</SelectItem>
                         {vertices.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Manage Vertices
                            <MoreHorizontal className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <div className="px-2 py-1.5">
                            <p className="text-sm font-medium">Vertex Management</p>
                            <p className="text-xs text-muted-foreground">Add or remove vertices</p>
                          </div>
                          <div className="border-t my-1"></div>
                          <div className="px-1 py-1">
                            <AddVertexDialog onVertexAdd={(newVertex) => {
                              const updatedVertices = [...vertices, newVertex];
                              setVertices(updatedVertices);
                              sessionStorage.setItem('vertices', JSON.stringify(updatedVertices));
                              window.dispatchEvent(new Event('verticesChanged'));
                            }} />
                          </div>
                          {vertices.length > 0 && (
                            <>
                              <div className="border-t my-1"></div>
                              <div className="px-2 py-1.5">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Current Vertices:</p>
                                <div className="space-y-1">
                                  {vertices.map((vertex) => (
                                    <div key={vertex} className="flex items-center justify-between text-sm">
                                      <span className="truncate">{vertex}</span>
                                      <DeleteVertexDialog
                                        vertexToDelete={vertex}
                                        onVertexDelete={(vertexToDelete) => {
                                          const updatedVertices = vertices.filter(v => v !== vertexToDelete);
                                          setVertices(updatedVertices);
                                          sessionStorage.setItem('vertices', JSON.stringify(updatedVertices));
                                          window.dispatchEvent(new Event('verticesChanged'));
                                          if (vertexFilter === vertexToDelete) {
                                            setVertexFilter('all');
                                          }
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                 {isAdmin && !isClient && <CreateTaskDialog addTask={addTask} currentUser={currentUser} />}
              </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-visible">
          {isAdmin && selectedTasks.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-secondary border-b rounded-t-lg">
              <span className="text-sm font-medium">{selectedTasks.length} task(s) selected</span>
              <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteConfirming(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          )}
          {/* Toggle View */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="flex items-center gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Card View
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Table View
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {visibleTasks.length} task{visibleTasks.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {viewMode === 'cards' ? (
            // Card View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                {visibleTasks.length > 0 ? (
                  visibleTasks.map((task) => {
                    const taskId = getTaskId(task);
                    const isDirty = !!editedTasks[taskId] && Object.keys(editedTasks[taskId]).length > 0;
                    const displayTask = { ...task, ...editedTasks[taskId] };
                    const completionStatus = getCompletionStatus(displayTask);


                    return (
                      <Card key={taskId} className={cn('hover:shadow-md transition-shadow', isDirty && 'ring-2 ring-yellow-300', selectedTasks.includes(taskId) && 'ring-2 ring-primary')}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {isAdmin && (
                                <Checkbox
                                  checked={selectedTasks.includes(taskId)}
                                  onCheckedChange={() => handleSelectTask(taskId)}
                                  className="mb-2"
                                />
                              )}
                              <Link href={`/task/${taskId}`} className="hover:underline">
                                <CardTitle className="text-lg font-semibold text-primary hover:underline">
                                  {displayTask.name}
                                </CardTitle>
                              </Link>
                              <p className="text-xs text-muted-foreground mt-1">ID: {taskId}</p>
                              <p className="text-xs text-muted-foreground">Created: {task.createdDate ? format(parseISO(task.createdDate), 'MMM d, yyyy') : 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn('text-white text-xs', getPriorityBadgeClass(displayTask.priority))}>
                                {displayTask.priority}
                              </Badge>
                              {isDirty && (
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleSaveClick(task)} className="h-6 w-6">
                                    <Save className="h-2 w-2 text-primary" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleResetChanges(taskId)} className="h-6 w-6">
                                    <RotateCcw className="h-2 w-2 text-muted-foreground" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Basic Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Client</label>
                              <p className="text-sm font-medium">{displayTask.client}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Vertex</label>
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">{displayTask.vertex}</Badge>
                              </div>
                            </div>
                          </div>

                          {/* Assignment */}
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
                            <p className="text-sm font-medium mt-1">{typeof displayTask.assignedTo === 'object' ? displayTask.assignedTo?.name || 'Unassigned' : displayTask.assignedTo || 'Unassigned'}</p>
                          </div>

                          {/* Dates */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                              <p className="text-sm mt-1">{displayTask.startDate ? new Date(displayTask.startDate).toLocaleDateString('en-GB') : 'Not set'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">End Date</label>
                              <p className="text-sm mt-1">{displayTask.endDate ? new Date(displayTask.endDate).toLocaleDateString('en-GB') : 'Not set'}</p>
                            </div>
                          </div>

                          {/* Progress */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-medium text-muted-foreground">Progress</label>
                              <span className="text-xs font-semibold">{displayTask.progress}%</span>
                            </div>
                            <Progress value={displayTask.progress} className="h-2" />
                          </div>

                          {/* Status and Review */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">User Status</label>
                              {canEdit(task) ? (
                                <Select
                                  value={displayTask.status}
                                  onValueChange={(value) => handleFieldUpdate(taskId, 'status', value as TaskStatus)}
                                >
                                  <SelectTrigger className="h-6 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={displayTask.status === 'Review' ? 'default' : 'secondary'} className={cn('mt-1', displayTask.status === 'Review' && 'bg-green-600')}>
                                  {displayTask.status}
                                </Badge>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Admin Status</label>
                              {(displayTask.status === 'In Progress' || displayTask.status === 'Review') ? (
                                <Select
                                  value={displayTask.reviewStatus}
                                  onValueChange={(value) => handleFieldUpdate(taskId, 'reviewStatus', value as ReviewStatus)}
                                  disabled={!isAdmin || (displayTask.status === 'Review' && displayTask.progress === 100)}
                                >
                                  <SelectTrigger className="h-6 text-xs">
                                    <SelectValue placeholder="Select review..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {REVIEW_STATUSES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select
                                  value={displayTask.reviewStatus}
                                  onValueChange={(value) => handleFieldUpdate(taskId, 'reviewStatus', value as ReviewStatus)}
                                >
                                  <SelectTrigger className="h-6 text-xs">
                                    <SelectValue placeholder="Select review..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Manager Review">Manager Review</SelectItem>
                                    <SelectItem value="Creative Review">Creative Review</SelectItem>
                                    <SelectItem value="Client Review">Client Review</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>

                          {/* Cost and Completion */}
                          <div className="grid grid-cols-2 gap-4">
                            {isAdmin && (
                              <div>
                                <label className="text-xs font-medium text-muted-foreground">Est. Cost</label>
                                <div className="flex items-center gap-1 text-sm font-semibold mt-1">
                                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                  {calculateApproxCost(displayTask).toLocaleString('en-IN')}
                                </div>
                              </div>
                            )}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Completion</label>
                              <div className="mt-1">
                                {completionStatus.text && (
                                  <Badge className={cn('text-white text-xs', completionStatus.className)}>
                                    {completionStatus.text}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Remarks */}
                          {isAdmin && (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Admin Notes</label>
                              {editingRemarks === taskId ? (
                                <div className="space-y-2 mt-1">
                                  <Textarea
                                    value={displayTask.remarks || ''}
                                    onChange={(e) => handleFieldUpdate(taskId, 'remarks', e.target.value)}
                                    className="text-xs"
                                    placeholder="Add admin notes..."
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => {
                                        handleSaveClick(task);
                                        setEditingRemarks(null);
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        handleResetChanges(taskId);
                                        setEditingRemarks(null);
                                      }}
                                      className="h-6 text-xs px-2"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="text-sm cursor-pointer hover:bg-muted p-2 rounded border-2 border-dashed border-muted-foreground/20 min-h-[2rem] mt-1"
                                  onClick={() => setEditingRemarks(taskId)}
                                >
                                  {displayTask.remarks || <span className="text-muted-foreground text-xs">Click to add admin notes...</span>}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-12">
                    <ListChecks className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Tasks Found</h3>
                    <p className="text-muted-foreground text-center">No tasks match your current filter criteria.</p>
                  </div>
                )}
            </div>
          ) : (
            // Table View
            <div className="w-full rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {isAdmin && (
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={selectedTasks.length > 0 && selectedTasks.length === visibleTasks.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Task Name</TableHead>
                    <TableHead className="w-24 text-center">Start Date</TableHead>
                    <TableHead className="w-24 text-center">End Date</TableHead>
                    <TableHead className="w-20 text-center">Priority</TableHead>
                    <TableHead className="w-32">Assignee</TableHead>
                    <TableHead className="w-16 text-center">Vertex</TableHead>
                    <TableHead className="w-24 text-center">Progress</TableHead>
                    <TableHead className="w-24 text-center">User Status</TableHead>
                    <TableHead className="w-32 text-center">Admin Status</TableHead>
                    {isAdmin && <TableHead className="w-20 text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTasks.length > 0 ? (
                    visibleTasks.map((task) => {
                      const taskId = getTaskId(task);
                      const isDirty = !!editedTasks[taskId] && Object.keys(editedTasks[taskId]).length > 0;
                      const displayTask = { ...task, ...editedTasks[taskId] };

                      return (
                        <TableRow
                          key={taskId}
                          className={cn(
                            'hover:bg-muted/50 transition-colors',
                            isDirty && 'bg-yellow-50 dark:bg-yellow-900/20',
                            selectedTasks.includes(taskId) && 'bg-primary/5'
                          )}
                        >
                          {isAdmin && (
                            <TableCell className="text-center">
                              <Checkbox
                                checked={selectedTasks.includes(taskId)}
                                onCheckedChange={() => handleSelectTask(taskId)}
                              />
                            </TableCell>
                          )}

                          <TableCell className="py-4">
                            <Link href={`/task/${taskId}`} className="text-primary hover:underline">
                              <div className="font-medium line-clamp-2">{displayTask.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">Client: {displayTask.client}</div>
                            </Link>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="px-2 py-1 bg-secondary/50 rounded text-xs">
                              {displayTask.startDate ? new Date(displayTask.startDate).toLocaleDateString('en-GB') : 'Not set'}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="px-2 py-1 bg-secondary/50 rounded text-xs">
                              {displayTask.endDate ? new Date(displayTask.endDate).toLocaleDateString('en-GB') : 'Not set'}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge className={cn('text-xs text-white', getPriorityBadgeClass(displayTask.priority))}>
                              {displayTask.priority}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="px-2 py-1 bg-secondary/50 rounded text-sm font-medium">
                              {typeof displayTask.assignedTo === 'object' ? displayTask.assignedTo?.name || 'Unassigned' : displayTask.assignedTo || 'Unassigned'}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">{displayTask.vertex}</Badge>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{displayTask.progress}%</div>
                              <Progress value={displayTask.progress} className="h-2 w-full" />
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            {canEdit(task) ? (
                              <Select
                                value={displayTask.status}
                                onValueChange={(value) => handleFieldUpdate(taskId, 'status', value as TaskStatus)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant={displayTask.status === 'Review' ? 'default' : 'secondary'}
                                className={cn('text-xs', displayTask.status === 'Review' && 'bg-green-600')}
                              >
                                {displayTask.status}
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <Select
                              value={displayTask.reviewStatus}
                              onValueChange={(value) => handleFieldUpdate(taskId, 'reviewStatus', value as ReviewStatus)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select review..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Manager Review">Manager Review</SelectItem>
                                <SelectItem value="Creative Review">Creative Review</SelectItem>
                                <SelectItem value="Client Review">Client Review</SelectItem>
                                <SelectItem value="Delivered">Delivered</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {isAdmin && (
                            <TableCell className="text-center">
                              {isDirty ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSaveClick(task)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Save className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResetChanges(taskId)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link href={`/task/${task.id}`}>View Details</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setTaskToDelete(task)}
                                      className="text-destructive focus:bg-destructive/10"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 11 : 10} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <ListChecks className="h-12 w-12 text-muted-foreground" />
                          <div>
                            <h3 className="font-medium">No tasks found</h3>
                            <p className="text-sm text-muted-foreground">No tasks match your current filters.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task:
              <br />
              <strong className="mt-2 block">"{taskToDelete?.name}"</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isBulkDeleteConfirming} onOpenChange={setIsBulkDeleteConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedTasks.length} selected task(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!taskToSave} onOpenChange={(open) => !open && setTaskToSave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save the changes for this task? This action will update the task details permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
