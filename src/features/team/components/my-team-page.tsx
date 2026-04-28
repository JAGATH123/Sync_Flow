
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, Users, Building } from 'lucide-react';
import type { User, TeamMember, UserRole, ClientStakeholder, Vertices } from '@/types';
import { TEAM_MEMBERS as INITIAL_TEAM_MEMBERS, ALL_USERS as INITIAL_ALL_USERS, MOCK_CLIENTS, MOCK_VERTICES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ImageUpload from '@/components/shared/image-upload';

interface MyTeamPageProps {
  currentUser: User;
}

const teamMemberSchema = z.object({
  name: z.string().min(1, 'Employee name is required.'),
  empId: z.string().optional(),
  designation: z.string().min(1, 'Designation is required.'),
  email: z.string().email('A valid email is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['admin', 'user', 'client']),
  vertex: z.string().optional(),
  profileImage: z.string().optional(),
}).superRefine((data, ctx) => {
  // Employee ID is required for admin and user roles, optional for client
  if ((data.role === 'admin' || data.role === 'user') && (!data.empId || data.empId.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Employee ID is required for admin and user roles",
      path: ["empId"],
    });
  }
  // Vertex is required for client role
  if (data.role === 'client' && (!data.vertex || data.vertex.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Vertex is required for client role",
      path: ["vertex"],
    });
  }
});

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

const clientSchema = z.object({
    name: z.string().min(1, 'Stakeholder name is required.'),
    email: z.string().email('A valid email is required.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    vertex: z.string().min(1, 'Vertex is required.'),
    designation: z.string().min(1, 'Designation is required.'),
    profileImage: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;


export default function MyTeamPage({ currentUser }: MyTeamPageProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<ClientStakeholder[]>([]);

  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [deletingTeamMember, setDeletingTeamMember] = useState<TeamMember | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientStakeholder | null>(null);

  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);
  const [editingClient, setEditingClient] = useState<ClientStakeholder | null>(null);
  
  const [confirmingSave, setConfirmingSave] = useState< {type: 'team' | 'client', data: any} | null >(null);
  const { toast } = useToast();
  const isAdmin = currentUser.role === 'admin';

  // API Functions
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();

      if (data.success) {
        const users = data.users;
        setAllUsers(users);

        // Convert users to team members format for backward compatibility
        const members: TeamMember[] = users
          .filter((user: any) => user.role !== 'client')
          .map((user: any) => ({
            name: user.name,
            empId: user.empId || `EMP-${user._id || user.id}`,
            designation: user.designation || 'Employee',
            email: user.email,
            role: user.role,
            profileImage: user.profileImage
          }));
        setTeamMembers(members);
        sessionStorage.setItem('teamMembers', JSON.stringify(members));
        window.dispatchEvent(new Event('teamMembersChanged'));

        // Filter clients
        const clientUsers = users
          .filter((user: any) => user.role === 'client')
          .map((user: any) => ({
            id: user._id || user.id,
            name: user.name,
            email: user.email,
            vertex: user.vertex,
            designation: user.designation || 'Client'
          }));
        setClients(clientUsers);
        console.log('Filtered client users:', clientUsers);
      } else {
        console.error('Failed to fetch users:', data.error);
        // Fallback to mock data
        setTeamMembers(INITIAL_TEAM_MEMBERS);
        sessionStorage.setItem('teamMembers', JSON.stringify(INITIAL_TEAM_MEMBERS));
        setAllUsers(INITIAL_ALL_USERS);
        setClients(MOCK_CLIENTS);
        window.dispatchEvent(new Event('teamMembersChanged'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to mock data
      setTeamMembers(INITIAL_TEAM_MEMBERS);
      sessionStorage.setItem('teamMembers', JSON.stringify(INITIAL_TEAM_MEMBERS));
      setAllUsers(INITIAL_ALL_USERS);
      setClients(MOCK_CLIENTS);
      window.dispatchEvent(new Event('teamMembersChanged'));
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async (userData: TeamMemberFormValues | ClientFormValues, isClient: boolean = false) => {
    try {
      const apiData = isClient
        ? { ...userData, role: 'client' }
        : { ...userData, vertex: userData.vertex || undefined };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      return data.user;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create user');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);
  
  const teamForm = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: { name: '', empId: '', designation: '', email: '', password: '', role: 'user', vertex: '' },
  });

  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', email: '', password: '', vertex: '', designation: '' },
  });

  const updateAndNotify = (updatedMembers: TeamMember[], updatedUsers: User[]) => {
    setTeamMembers(updatedMembers);
    sessionStorage.setItem('teamMembers', JSON.stringify(updatedMembers));
    window.dispatchEvent(new Event('teamMembersChanged'));

    setAllUsers(updatedUsers);
    sessionStorage.setItem('allUsers', JSON.stringify(updatedUsers));
    window.dispatchEvent(new Event('userChanged'));
  };

  const handleEditTeamMember = (item: TeamMember) => {
    setEditingTeamMember(item);
    teamForm.reset({ name: item.name, empId: item.empId, designation: item.designation, email: item.email, password: '', role: item.role, vertex: '' });
    setIsTeamDialogOpen(true);
  };
  
  const handleEditClient = (item: ClientStakeholder) => {
    setEditingClient(item);
    clientForm.reset({ name: item.name, email: item.email, password: '', vertex: item.vertex, designation: item.designation });
    setIsClientDialogOpen(true);
  };

  const handleAddNewTeamMember = () => {
    setEditingTeamMember(null);
    teamForm.reset({ name: '', empId: '', designation: '', email: '', password: '', role: 'user', vertex: '' });
    setIsTeamDialogOpen(true);
  };

  const handleAddNewClient = () => {
    setEditingClient(null);
    clientForm.reset({ name: '', email: '', password: '', vertex: MOCK_VERTICES[0], designation: '' });
    setIsClientDialogOpen(true);
  };

  const handleDeleteTeamMember = async () => {
    if (!deletingTeamMember) return;

    try {
      // Find the user ID from the allUsers array
      const userToDelete = allUsers.find(user => user.email === deletingTeamMember.email);

      if (!userToDelete) {
        throw new Error('User not found');
      }

      const response = await fetch(`/api/users?id=${userToDelete.id || (userToDelete as any)._id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the users list from the database
        await fetchUsers();
        toast({
          title: 'Member Deleted',
          description: `"${deletingTeamMember.name}" has been removed from the team.`,
          variant: 'destructive',
        });
      } else {
        throw new Error(data.error || 'Failed to delete team member');
      }
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete team member',
        variant: 'destructive',
      });
    }

    setDeletingTeamMember(null);
  };
  
   const handleDeleteClient = async () => {
    if (!deletingClient) return;

    try {
      const response = await fetch(`/api/users?id=${deletingClient.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the users list
        await fetchUsers();
        toast({
          title: 'Client Deleted',
          description: `"${deletingClient.name}" has been removed.`,
          variant: 'destructive',
        });
      } else {
        throw new Error(data.error || 'Failed to delete client');
      }
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete client',
        variant: 'destructive',
      });
    }

    setDeletingClient(null);
  };

  const handleConfirmSave = async () => {
    if (!confirmingSave) return;
    const { type, data } = confirmingSave;

    try {
      setIsLoading(true);

      if (type === 'team') {
        if (editingTeamMember) {
          // Update existing user - note: password updates would need separate endpoint
          toast({ title: 'Info', description: 'User editing is not fully implemented yet. Please delete and recreate for now.' });
        } else {
          // Create new team member
          await createUser(data, false);
          await fetchUsers(); // Refresh the list
          toast({ title: 'Member Added', description: `"${data.name}" has been added to the team and can now log in.` });
        }
        setIsTeamDialogOpen(false);
        setEditingTeamMember(null);
      } else if (type === 'client') {
        if (editingClient) {
          // Update existing client - note: password updates would need separate endpoint
          toast({ title: 'Info', description: 'Client editing is not fully implemented yet. Please delete and recreate for now.' });
        } else {
          // Create new client
          await createUser(data, true);
          await fetchUsers(); // Refresh the list
          toast({ title: 'Client Added', description: `"${data.name}" has been added and can now log in.` });
        }
        setIsClientDialogOpen(false);
        setEditingClient(null);
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }

    setConfirmingSave(null);
  };

  const onTeamSubmit: SubmitHandler<TeamMemberFormValues> = (values) => {
    setConfirmingSave({ type: 'team', data: values });
  };
  
  const onClientSubmit: SubmitHandler<ClientFormValues> = (values) => {
    setConfirmingSave({ type: 'client', data: values });
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Gradient Design */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                My Team
              </h1>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Comprehensive team management and collaboration tools for your organization
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600">{teamMembers.length}</div>
              <div className="text-xs text-muted-foreground">Team Members</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-purple-600">{clients.length}</div>
              <div className="text-xs text-muted-foreground">Client Contacts</div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
               <Users className="h-6 w-6" />
                <div>
                  <CardTitle>My Team</CardTitle>
                  <CardDescription>View and manage your team members' information.</CardDescription>
                </div>
            </div>
            {isAdmin && (
              <Button onClick={handleAddNewTeamMember}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary">
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {isAdmin && <TableHead className="text-right w-32">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((item, index) => (
                  <TableRow key={item.empId || item.email || `team-${index}`}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.empId}</TableCell>
                    <TableCell>{item.designation}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>
                      <Badge variant={item.role === 'admin' ? 'default' : 'secondary'} className="capitalize">{item.role}</Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTeamMember(item)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletingTeamMember(item)} disabled={item.role === 'admin'}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {teamMembers.length === 0 && (
                  <TableRow key="empty-team-members"><TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">No team members added yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {isAdmin && (
          <div className="mt-8">
            <Separator />
            <Card className="mt-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <Building className="h-6 w-6" />
                        <div>
                          <CardTitle>Client Stakeholders</CardTitle>
                          <CardDescription>Manage client contacts for each vertex.</CardDescription>
                        </div>
                    </div>
                  <Button onClick={handleAddNewClient}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Client
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-secondary">
                      <TableRow>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Vertex</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead className="text-right w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client, index) => (
                        <TableRow key={client.id || client.email || `client-${index}`}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell><Badge variant="outline">{client.vertex}</Badge></TableCell>
                          <TableCell>{client.designation}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClient(client)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletingClient(client)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {clients.length === 0 && (
                        <TableRow key="empty-clients"><TableCell colSpan={5} className="h-24 text-center">No clients added yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
      )}

      {/* Team Member Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeamMember ? 'Edit' : 'Add New'} Team Member</DialogTitle>
          </DialogHeader>
          <Form {...teamForm}>
            <form onSubmit={teamForm.handleSubmit(onTeamSubmit)} className="space-y-4">
              <FormField control={teamForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Employee Name</FormLabel><FormControl><Input placeholder="E.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
              {teamForm.watch('role') !== 'client' && (
                <FormField control={teamForm.control} name="empId" render={({ field }) => (<FormItem><FormLabel>Employee ID</FormLabel><FormControl><Input placeholder="E.g., JD001" {...field} disabled={!!editingTeamMember} /></FormControl><FormMessage /></FormItem>)} />
              )}
              <FormField control={teamForm.control} name="designation" render={({ field }) => (<FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="E.g., Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={teamForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="E.g., john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={teamForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Enter password (min 6 characters)" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={teamForm.control} name="profileImage" render={({ field }) => (<FormItem><FormControl><ImageUpload value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={teamForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={(value: UserRole) => field.onChange(value)} defaultValue={field.value} disabled={editingTeamMember?.email === currentUser.email}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="user">User</SelectItem><SelectItem value="client">Client</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              {teamForm.watch('role') === 'client' && (
                <FormField control={teamForm.control} name="vertex" render={({ field }) => (<FormItem><FormLabel>Vertex</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a vertex" /></SelectTrigger></FormControl><SelectContent>{MOCK_VERTICES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              )}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit" disabled={teamForm.formState.isSubmitting || isLoading}>{(teamForm.formState.isSubmitting || isLoading) ? <><Loader2 className="animate-spin mr-2 h-4 w-4" />Creating...</> : (editingTeamMember ? 'Save Changes' : 'Add Member')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Client Dialog */}
       <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit' : 'Add New'} Client</DialogTitle>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-4">
              <FormField control={clientForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="E.g., Sarah Connor" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={clientForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="E.g., s.connor@cyberdyne.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={clientForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Enter password (min 6 characters)" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={clientForm.control} name="profileImage" render={({ field }) => (<FormItem><FormControl><ImageUpload value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={clientForm.control} name="vertex" render={({ field }) => (<FormItem><FormLabel>Vertex</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a vertex" /></SelectTrigger></FormControl><SelectContent>{MOCK_VERTICES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={clientForm.control} name="designation" render={({ field }) => (<FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="E.g., Project Lead" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit" disabled={clientForm.formState.isSubmitting || isLoading}>{(clientForm.formState.isSubmitting || isLoading) ? <><Loader2 className="animate-spin mr-2 h-4 w-4" />Creating...</> : (editingClient ? 'Save Changes' : 'Add Client')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={!!deletingTeamMember} onOpenChange={(open) => !open && setDeletingTeamMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the team member: "{deletingTeamMember?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTeamMember} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the client: "{deletingClient?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteClient} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={!!confirmingSave} onOpenChange={(open) => !open && setConfirmingSave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Changes</AlertDialogTitle><AlertDialogDescription>Are you sure you want to save these changes?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setConfirmingSave(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmSave}>Save</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
