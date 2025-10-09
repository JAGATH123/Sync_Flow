
'use client';

import { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { MOCK_TASKS, ALL_USERS, MOCK_VERTICES, TEAM_MEMBERS as INITIAL_TEAM_MEMBERS } from '@/lib/mock-data';
import { COST_RATES, WORK_TYPES, TASK_STATUSES, TASK_PRIORITIES } from '@/lib/types';
import type { Task, User, TaskStatus, WorkType, Vertices, TaskPriority, TeamMember } from '@/lib/types';
import { 
    ArrowLeft, 
    User as UserIcon, 
    Calendar, 
    Briefcase, 
    CheckCircle, 
    Clock, 
    IndianRupee, 
    BrainCircuit,
    Save,
    RotateCcw,
    AlertTriangle,
    Hourglass,
    MessageSquare,
    Edit,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { isEqual } from 'lodash';
import { cn } from '@/lib/utils';


const PROGRESS_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(ALL_USERS[0]); // Simulating logged in user
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);


  useEffect(() => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    const storedTasks = sessionStorage.getItem('tasks');
    const allTasks = storedTasks ? JSON.parse(storedTasks) : MOCK_TASKS;
    const foundTask = allTasks.find((t: Task) => t.id === id);
    
    if (foundTask) {
      setTask(foundTask);
      setEditedTask(foundTask);
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
  }, [id]);
  
  useEffect(() => {
    const handleUserChange = () => {
      const storedUser = sessionStorage.getItem('currentUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    };
    
    const handleTeamChange = () => {
      const updatedMembers = sessionStorage.getItem('teamMembers');
      if (updatedMembers) {
        setTeamMembers(JSON.parse(updatedMembers));
      }
    };

    window.addEventListener('userChanged', handleUserChange);
    window.addEventListener('teamMembersChanged', handleTeamChange);
    return () => {
        window.removeEventListener('userChanged', handleUserChange);
        window.removeEventListener('teamMembersChanged', handleTeamChange);
    }
  }, []);

  const isAdmin = currentUser.role === 'admin';
  const isAssignedUser = task?.assignedTo === currentUser.name;
  const isClient = currentUser.role === 'client';

  const isDirty = useMemo(() => {
    if (!task || !editedTask) return false;
    return !isEqual(task, editedTask);
  }, [task, editedTask]);


  const handleFieldUpdate = (field: keyof Task, value: any) => {
    if (!editedTask) return;
    
    let updatedTask = { ...editedTask, [field]: value };

    if (field === 'progress') {
        const newProgress = Number(value);
        if (newProgress === 100) {
            updatedTask.status = 'Delivered';
            if (!editedTask.completionDate) {
                 updatedTask.completionDate = new Date().toISOString().split('T')[0];
            }
        } else if (newProgress > 0 && newProgress < 100) {
            updatedTask.status = 'In Progress';
        } else if (newProgress === 0) {
            updatedTask.status = 'Not Started';
        }
    }
    
    if (field === 'status') {
      switch (value) {
        case 'Delivered':
            updatedTask.progress = 100;
            if (!editedTask.completionDate) {
                updatedTask.completionDate = new Date().toISOString().split('T')[0];
            }
            break;
        case 'Not Started':
            updatedTask.progress = 0;
            break;
        case 'In Progress':
             if (editedTask.progress === 100) {
                updatedTask.progress = 80;
            } else if (editedTask.progress === 0) {
                 updatedTask.progress = 20;
            }
            break;
      }
    }

    setEditedTask(updatedTask);
  };

  const handleSaveChanges = () => {
     if (!editedTask) return;
    
    setTask(editedTask);
    
    const storedTasks = sessionStorage.getItem('tasks');
    const allTasks = storedTasks ? JSON.parse(storedTasks) : MOCK_TASKS;
    const updatedTasks = allTasks.map((t: Task) => t.id === editedTask!.id ? editedTask : t);
    sessionStorage.setItem('tasks', JSON.stringify(updatedTasks));
    window.dispatchEvent(new Event('tasksChanged'));

    toast({
        title: 'Task Updated',
        description: `Your changes to the task have been saved successfully.`,
    });
    setIsConfirmingSave(false);
    setIsEditMode(false);
  };

  const handleResetChanges = () => {
    setEditedTask(task);
    if(isAdmin) setIsEditMode(false);
  }
  
  const toggleEditMode = () => {
    if (isAdmin) {
      setIsEditMode(!isEditMode);
      if (isEditMode) {
        setEditedTask(task);
      }
    }
  }

  const calculateApproxCost = () => {
    if (!editedTask) return 0;
    const rate = COST_RATES[editedTask.typeOfWork] || 0;
    return (editedTask.actualWorkingHours || editedTask.workingHours) * rate;
  }
  
  const getPriorityBadgeClass = (priority: Task['priority']) => {
    switch(priority) {
      case 'High': return 'bg-red-500 text-white hover:bg-red-600';
      case 'Medium': return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'Low': return 'bg-gray-500 text-white hover:bg-gray-600';
      default: return 'bg-gray-400 text-white';
    }
  }
  
  const isFieldDisabled = (fieldName: keyof Task) => {
    if (isClient) return true;
    if (isAdmin) {
      // Admins can edit anything, but only when in 'Edit Mode'
      return !isEditMode;
    }
    if (isAssignedUser) {
      // Assigned users can only edit specific fields
      const userEditableFields: (keyof Task)[] = ['progress', 'status', 'actualWorkingHours'];
      return !userEditableFields.includes(fieldName);
    }
    // Everyone else has read-only access
    return true;
  }


  if (!editedTask) {
    return (
        <div className="flex justify-center items-center h-screen">
            <p>Loading task or task not found...</p>
        </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-secondary/40">
        <div className="w-full space-y-6 p-4 sm:p-6 md:p-8">
          <Button asChild variant="outline" size="sm">
              <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to All Tasks
              </Link>
          </Button>

          <Card>
              <CardHeader className="border-b">
                  <div className="flex justify-between items-start">
                      <div>
                          <CardTitle className="text-2xl font-bold">{editedTask.name}</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground mt-1">{editedTask.id}</CardDescription>
                      </div>
                       <div className="flex items-center gap-2">
                           <Badge className={cn('text-sm font-semibold', getPriorityBadgeClass(editedTask.priority))}>
                                <AlertTriangle className="mr-2 h-4 w-4" />{editedTask.priority}
                            </Badge>
                           <Badge variant="outline" className="text-sm font-semibold">{editedTask.vertex}</Badge>
                           {isAdmin && (
                              <Button variant="outline" size="sm" onClick={toggleEditMode}>
                                {isEditMode ? <X className="mr-2 h-4 w-4"/> : <Edit className="mr-2 h-4 w-4" />}
                                {isEditMode ? 'Cancel' : 'Edit Task'}
                              </Button>
                           )}
                       </div>
                  </div>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                  <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground">Task Name / Description</Label>
                      <Textarea 
                          value={editedTask.name}
                          onChange={(e) => handleFieldUpdate('name', e.target.value)}
                          disabled={isFieldDisabled('name')}
                          rows={3}
                          className="text-base"
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {/* Column 1: People & Dates */}
                      <div className="space-y-6">
                           <div className="space-y-2">
                              <Label className="text-muted-foreground flex items-center gap-2 font-semibold"><Briefcase className="h-4 w-4" />Client</Label>
                               <Input value={editedTask.client} onChange={(e) => handleFieldUpdate('client', e.target.value)} disabled={isFieldDisabled('client')}/>
                          </div>
                          <div className="space-y-2">
                              <Label className="text-muted-foreground flex items-center gap-2 font-semibold"><UserIcon className="h-4 w-4" />Assigned To</Label>
                              <Select
                                  value={editedTask.assignedTo}
                                  onValueChange={(value) => handleFieldUpdate('assignedTo', value)}
                                  disabled={isFieldDisabled('assignedTo')}
                              >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{teamMembers.map(m => <SelectItem key={m.empId} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                           <div className="space-y-2">
                              <Label className="text-muted-foreground flex items-center gap-2 font-semibold"><Calendar className="h-4 w-4" />Task Dates</Label>
                              <div className="flex items-center gap-2">
                                  <Input type="date" value={editedTask.startDate} onChange={(e) => handleFieldUpdate('startDate', e.target.value)} disabled={isFieldDisabled('startDate')}/>
                                  <span className="text-muted-foreground">-</span>
                                  <Input type="date" value={editedTask.endDate} onChange={(e) => handleFieldUpdate('endDate', e.target.value)} disabled={isFieldDisabled('endDate')}/>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <Label className="text-muted-foreground flex items-center gap-2 font-semibold"><Calendar className="h-4 w-4" />Created Date</Label>
                              <Input type="date" value={editedTask.createdDate} disabled />
                          </div>
                      </div>

                      {/* Column 2: Details & Cost */}
                       <div className="space-y-6">
                          <div className="space-y-2">
                              <Label className="text-muted-foreground flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Priority</Label>
                               <Select
                                  value={editedTask.priority}
                                  onValueChange={(value: TaskPriority) => handleFieldUpdate('priority', value)}
                                  disabled={isFieldDisabled('priority')}
                              >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-2">
                              <Label className="text-muted-foreground flex items-center gap-2 font-semibold"><BrainCircuit className="h-4 w-4" />Type of Work</Label>
                               <Select
                                  value={editedTask.typeOfWork}
                                  onValueChange={(value: WorkType) => handleFieldUpdate('typeOfWork', value)}
                                  disabled={isFieldDisabled('typeOfWork')}
                              >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{WORK_TYPES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          {isAdmin && (
                            <div className="space-y-2">
                                <Label className="text-muted-foreground flex items-center gap-2 font-semibold"><IndianRupee className="h-4 w-4" />Approximate Cost</Label>
                                <p className="font-bold text-xl pt-2">₹{calculateApproxCost().toLocaleString('en-IN')}</p>
                            </div>
                          )}
                      </div>
                      
                      {/* Column 3: Hours */}
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="text-muted-foreground flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" />Estimated Hours</Label>
                            <Input 
                                type="number" 
                                value={editedTask.workingHours} 
                                onChange={(e) => handleFieldUpdate('workingHours', parseInt(e.target.value, 10) || 0)} 
                                disabled={isFieldDisabled('workingHours')}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-muted-foreground flex items-center gap-2 font-semibold"><Hourglass className="h-4 w-4" />Actual Hours Logged</Label>
                            <Input 
                                type="number" 
                                value={editedTask.actualWorkingHours || ''} 
                                onChange={(e) => handleFieldUpdate('actualWorkingHours', parseInt(e.target.value, 10) || undefined)} 
                                disabled={isFieldDisabled('actualWorkingHours')}
                                placeholder="Log hours..."
                            />
                          </div>
                      </div>
                  </div>
                  
                  <div className="space-y-2">
                      <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />Remarks for Timeline Change
                      </Label>
                      <Textarea 
                          value={editedTask.remarks || ''}
                          onChange={(e) => handleFieldUpdate('remarks', e.target.value)}
                          disabled={isFieldDisabled('remarks')}
                          rows={3}
                          className="text-base"
                          placeholder={isAdmin ? "Add remarks for any changes to scope, timeline, etc..." : "No remarks provided."}
                      />
                  </div>

                  <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                          <Label className="font-semibold">Task Progress</Label>
                           <Progress value={editedTask.progress} className="h-2.5 mt-2" />
                          <Select 
                              value={editedTask.progress.toString()} 
                              onValueChange={(value) => handleFieldUpdate('progress', parseInt(value, 10))}
                              disabled={isFieldDisabled('progress')}
                          >
                              <SelectTrigger>
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  {PROGRESS_OPTIONS.map(p => (
                                      <SelectItem key={p} value={p.toString()}>{p}%</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label className="font-semibold">Task Status</Label>
                          <Select 
                              value={editedTask.status} 
                              onValueChange={(value: TaskStatus) => handleFieldUpdate('status', value)}
                              disabled={isFieldDisabled('status')}
                          >
                              <SelectTrigger>
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  {TASK_STATUSES.map(status => (
                                      <SelectItem key={status} value={status}>{status}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                   {isAssignedUser && !isAdmin && (
                    <p className="text-xs text-center text-muted-foreground pt-4">As an assigned user, you can only update Progress, Status, and log actual hours. Other fields are read-only.</p>
                  )}
                  {isClient && (
                    <p className="text-xs text-center text-muted-foreground pt-4">As a client, you have read-only access to task details.</p>
                  )}
              </CardContent>
              { isDirty && !isClient && (
                <CardFooter className="flex justify-end gap-2 bg-secondary/50 border-t p-4">
                    <Button variant="outline" onClick={handleResetChanges}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Reset
                    </Button>
                    <Button onClick={() => setIsConfirmingSave(true)}>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                </CardFooter>
              )}
          </Card>
        </div>
      </div>
      <AlertDialog open={isConfirmingSave} onOpenChange={setIsConfirmingSave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save the changes made to this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveChanges}>
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
