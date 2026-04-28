
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Task, Vertices, WorkType, TaskPriority, TaskCategory, User, TeamMember } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlusCircle, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { MOCK_VERTICES, TEAM_MEMBERS as INITIAL_TEAM_MEMBERS } from '@/lib/mock-data';
import { WORK_TYPES, TASK_PRIORITIES, COST_RATES } from '@/lib/constants';
import { format, add } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { emitTaskCreated } from '@/lib/realtime';


const formSchema = z.object({
  name: z.string().min(10, 'Task name must be at least 10 characters long.'),
  client: z.string().min(1, 'Client name is required.'),
  clientEmail: z.string().email('Invalid email address.').optional().or(z.literal('')),
  assignedTo: z.string().min(1, 'Please assign the task to a team member.'),
  assigneeEmail: z.string().email('Invalid email address.').optional().or(z.literal('')),
  vertex: z.string().min(1, 'Vertices is required.'),
  typeOfWork: z.enum(['Design', 'Development', 'QA', 'Marketing']),
  priority: z.enum(TASK_PRIORITIES),
  category: z.string().min(1, 'Category is required.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  workingHours: z.coerce.number().min(1, 'Working hours must be at least 1.'),
  estimatedCost: z.coerce.number().min(0, 'Estimated cost cannot be negative.'),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTaskDialogProps {
  addTask: (task: Task) => void;
  currentUser: User;
}

export default function CreateTaskDialog({ addTask, currentUser }: CreateTaskDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const today = new Date();
  const [vertices, setVertices] = useState<string[]>(MOCK_VERTICES);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);

  useEffect(() => {
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

    // Load vertices from session storage (keeping this as is for now)
    const storedVertices = sessionStorage.getItem('vertices');
    if (storedVertices) {
      setVertices(JSON.parse(storedVertices));
    }
  }, []);

  
  const isAdmin = currentUser.role === 'admin';
  const isClient = currentUser.role === 'client';


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      client: '',
      clientEmail: '',
      assignedTo: '',
      assigneeEmail: '',
      vertex: 'CMIS',
      typeOfWork: 'Development',
      priority: 'Medium',
      category: '',
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(add(today, { weeks: 1 }), 'yyyy-MM-dd'),
      workingHours: 8,
      estimatedCost: 680, // 8 hours * 85 (Development rate)
    },
  });

  const assignedToValue = form.watch('assignedTo');
  const workingHours = form.watch('workingHours');
  const typeOfWork = form.watch('typeOfWork');
  const priority = form.watch('priority');

  useEffect(() => {
    const member = teamMembers.find(m => m.name === assignedToValue);
    if (member) {
      form.setValue('assigneeEmail', member.email);
    } else {
      form.setValue('assigneeEmail', '');
    }
  }, [assignedToValue, form, teamMembers]);

  // Auto-calculate estimated cost when hours, work type, or priority changes
  useEffect(() => {
    const rate = COST_RATES[typeOfWork as keyof typeof COST_RATES] || 85;
    const baseCost = workingHours * rate;

    // Apply priority multiplier - Urgent tasks add 150% markup (total 250%)
    const priorityMultiplier = priority === 'Urgent' ? 2.5 : 1.0;
    const finalCost = Math.round(baseCost * priorityMultiplier);

    form.setValue('estimatedCost', finalCost);
  }, [workingHours, typeOfWork, priority, form]);

  const generateUniqueId = (vertex: string, category: string, name: string): string => {
    const vertexPart = vertex.substring(0, 2).toUpperCase();
    const categoryPart = category.substring(0, 2).toUpperCase();
    const namePart = name.replace(/\s+/g, '').substring(0, 2).toUpperCase();
    const timePart = Date.now().toString().slice(-2);
    return `${vertexPart}${categoryPart}${namePart}${timePart}`.padEnd(8, 'X');
  };
  
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);

    try {
      // Get the authentication token
      const token = localStorage.getItem('token');

      console.log('Creating task with token:', token ? 'Token exists' : 'No token found');

      if (!token) {
        setIsLoading(false);
        setIsOpen(false);
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue.',
          variant: 'destructive',
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return;
      }

      console.log('Sending POST request to /api/tasks...');

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          client: data.client,
          clientEmail: data.clientEmail,
          assignedTo: data.assignedTo,
          assigneeEmail: data.assigneeEmail,
          vertex: data.vertex,
          startDate: data.startDate,
          endDate: data.endDate,
          typeOfWork: data.typeOfWork,
          category: data.category,
          workingHours: data.workingHours,
          estimatedCost: data.estimatedCost,
          priority: data.priority,
        }),
      });

      console.log('Response status:', response.status);

      const result = await response.json();

      // Handle unauthorized/expired token
      if (response.status === 401) {
        setIsLoading(false);
        setIsOpen(false);
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive',
        });
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return;
      }

      if (response.ok && result.task) {
        // Use the task returned from the API with proper _id
        const apiTask = result.task;
        const newTask: Task = {
          id: apiTask._id || apiTask.id,
          _id: apiTask._id,
          name: apiTask.name,
          assignedTo: apiTask.assignedToName || apiTask.assignedTo?.name || data.assignedTo,
          status: apiTask.status || 'Not Started',
          progress: apiTask.progress || 0,
          startDate: apiTask.startDate?.split('T')[0] || data.startDate,
          endDate: apiTask.endDate?.split('T')[0] || data.endDate,
          createdDate: apiTask.createdDate?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
          client: apiTask.client || data.client,
          clientEmail: apiTask.clientEmail || data.clientEmail,
          assigneeEmail: apiTask.assigneeEmail || data.assigneeEmail,
          vertex: apiTask.vertex || data.vertex,
          typeOfWork: apiTask.typeOfWork || data.typeOfWork,
          category: apiTask.category || data.category,
          workingHours: apiTask.workingHours || data.workingHours,
          estimatedCost: apiTask.estimatedCost || data.estimatedCost,
          priority: apiTask.priority || data.priority,
        };

        addTask(newTask);

        // Emit realtime event with the API task - use setTimeout to ensure it's processed
        setTimeout(() => {
          emitTaskCreated(newTask);
          console.log('Task created event emitted:', newTask);
        }, 100);

        toast({
          title: 'Task Created!',
          description: `Task "${data.name}" has been created successfully and assigned to ${data.assignedTo}.`,
        });
      } else {
        throw new Error(result.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);

      // Check if it's a network error
      let errorMessage = 'Failed to create task. Please try again.';
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'Cannot connect to server. Please ensure the server is running on port 9002.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      setIsLoading(false);
      return; // Don't close dialog on error so user can retry
    }
    
    // Simulate sending emails
    if (data.assigneeEmail) {
        toast({
            title: 'Assignee Notified',
            description: `An email notification has been sent to ${data.assigneeEmail}.`,
        });
    }
     if (data.clientEmail) {
        toast({
            title: 'Client Notified',
            description: `An email notification has been sent to ${data.clientEmail}.`,
        });
    }

    setIsLoading(false);
    setIsOpen(false);
    form.reset();
  };
  
  if (isClient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Fill out the details below to create a new task.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[70vh] p-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Name / Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the task requirements..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <FormControl><Input placeholder="Enter client's name..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Email</FormLabel>
                      <FormControl><Input placeholder="E.g., jane.doe@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teamMembers.map((m) => (
                            <SelectItem key={m.empId} value={m.name}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="assigneeEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee Email</FormLabel>
                      <FormControl><Input placeholder="Assignee's email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                   <FormField
                    control={form.control}
                    name="vertex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vertices</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a vertices" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {vertices.map((vertex) => (
                                    <SelectItem key={vertex} value={vertex}>
                                        {vertex}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="typeOfWork" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type of Work</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{WORK_TYPES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a custom category..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                      <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                  />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                      <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workingHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Est. Working Hours</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 8" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Cost (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Auto-calculated"
                            {...field}
                            className="bg-secondary/20"
                            readOnly
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Rate: ₹{COST_RATES[typeOfWork as keyof typeof COST_RATES] || 85}/hour
                          {priority === 'Urgent' && <span className="text-orange-600 font-medium"> (+150% markup for Urgent)</span>}
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Task'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
