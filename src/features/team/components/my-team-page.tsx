'use client';

/**
 * MyTeamPage — read-only view of the global employee directory.
 *
 * Architecture rule: employee records are NEVER created here.
 * The Platform Portal is the single source of truth:
 *   POST /employees → creates in Portal + SyncFlow + TimeWise simultaneously.
 *
 * This page pulls from GET /employees (Platform API) and shows sync status.
 * Clients (project stakeholders) are still managed locally — they are not
 * global employees.
 */

import { apiFetch } from '@/lib/api/fetch';
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
import {
  PlusCircle, Edit, Trash2, Loader2, Users, Building,
  ExternalLink, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import type { User, ClientStakeholder } from '@/types';
import { MOCK_VERTICES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ImageUpload from '@/components/shared/image-upload';

interface MyTeamPageProps {
  currentUser: User;
}

// ── Platform employee record (from GET /employees) ────────────────────────────
interface PlatformEmployee {
  id:              number;
  full_name:       string;
  email:           string;
  badge_id:        string | null;
  designation:     string | null;
  department_name: string | null;
  is_active:       boolean;
  joined_at:       string | null;
  in_timewise:     boolean;
  in_syncflow:     boolean;
  in_horilla:      boolean;
}

// ── Client form ───────────────────────────────────────────────────────────────
const clientSchema = z.object({
  name:         z.string().min(1, 'Stakeholder name is required.'),
  email:        z.string().email('A valid email is required.'),
  password:     z.string().min(6, 'Password must be at least 6 characters.'),
  vertex:       z.string().min(1, 'Vertex is required.'),
  designation:  z.string().min(1, 'Designation is required.'),
  profileImage: z.string().optional(),
});
type ClientFormValues = z.infer<typeof clientSchema>;

const LOF_API = process.env.NEXT_PUBLIC_LOF_API_URL ?? 'http://localhost:8000';

export default function MyTeamPage({ currentUser }: MyTeamPageProps) {
  const [employees,   setEmployees]   = useState<PlatformEmployee[]>([]);
  const [clients,     setClients]     = useState<ClientStakeholder[]>([]);
  const [loadingEmp,  setLoadingEmp]  = useState(false);
  const [loadingCli,  setLoadingCli]  = useState(false);

  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [editingClient,      setEditingClient]       = useState<ClientStakeholder | null>(null);
  const [deletingClient,     setDeletingClient]      = useState<ClientStakeholder | null>(null);
  const [confirmingSave,     setConfirmingSave]      = useState<{ type: 'client'; data: ClientFormValues } | null>(null);

  const { toast } = useToast();
  const isAdmin = currentUser.role === 'admin';

  const portalUrl = process.env.NEXT_PUBLIC_LOF_PORTAL_URL ?? 'http://localhost:3001';

  // ── Fetch global employees from Platform API ─────────────────────────────
  const fetchEmployees = async () => {
    setLoadingEmp(true);
    try {
      const token =
        (typeof window !== 'undefined' && localStorage.getItem('lof-portal-token')) ||
        (typeof window !== 'undefined' && localStorage.getItem('lof_token'));

      if (!token) {
        setEmployees([]);
        return;
      }

      const res = await fetch(`${LOF_API}/employees?active_only=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data: PlatformEmployee[] = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } else {
        setEmployees([]);
      }
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmp(false);
    }
  };

  // ── Fetch SyncFlow clients ────────────────────────────────────────────────
  const fetchClients = async () => {
    setLoadingCli(true);
    try {
      const res = await apiFetch('/api/users');
      const data = await res.json();
      if (data.success) {
        const clientUsers = (data.users as any[])
          .filter(u => u.role === 'client')
          .map(u => ({
            id:          u._id || u.id,
            name:        u.name,
            email:       u.email,
            vertex:      u.vertex,
            designation: u.designation || 'Client',
          }));
        setClients(clientUsers);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingCli(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchClients();
  }, []);

  // ── Client form ───────────────────────────────────────────────────────────
  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', email: '', password: '', vertex: '', designation: '' },
  });

  const handleAddNewClient = () => {
    setEditingClient(null);
    clientForm.reset({ name: '', email: '', password: '', vertex: MOCK_VERTICES[0], designation: '' });
    setIsClientDialogOpen(true);
  };

  const handleEditClient = (item: ClientStakeholder) => {
    setEditingClient(item);
    clientForm.reset({ name: item.name, email: item.email, password: '', vertex: item.vertex, designation: item.designation });
    setIsClientDialogOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    try {
      const res = await apiFetch(`/api/users?id=${deletingClient.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchClients();
        toast({ title: 'Client Deleted', description: `"${deletingClient.name}" has been removed.`, variant: 'destructive' });
      } else {
        throw new Error(data.error || 'Failed to delete client');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete client', variant: 'destructive' });
    }
    setDeletingClient(null);
  };

  const onClientSubmit: SubmitHandler<ClientFormValues> = (values) => {
    setConfirmingSave({ type: 'client', data: values });
  };

  const handleConfirmSave = async () => {
    if (!confirmingSave) return;
    const { data } = confirmingSave;
    try {
      setLoadingCli(true);
      if (editingClient) {
        toast({ title: 'Info', description: 'Client editing not yet implemented. Please delete and recreate.' });
      } else {
        const res = await apiFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, role: 'client' }),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to create client');
        await fetchClients();
        toast({ title: 'Client Added', description: `"${data.name}" has been added.` });
      }
      setIsClientDialogOpen(false);
      setEditingClient(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save client', variant: 'destructive' });
    } finally {
      setLoadingCli(false);
      setConfirmingSave(null);
    }
  };

  // ── Sync badge ────────────────────────────────────────────────────────────
  function SyncBadge({ ok, label }: { ok: boolean; label: string }) {
    return ok ? (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" /> {label}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <XCircle className="h-3.5 w-3.5" /> {label}
      </span>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Portal CTA banner ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Global Employee Directory is managed in the Platform Portal
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Creating an employee in the Portal provisions them in SyncFlow, TimeWise, and the
              Platform simultaneously — one record, all systems.
            </p>
          </div>
        </div>
        <a
          href={`${portalUrl}/employee-management`}
          target="_blank"
          rel="noreferrer"
        >
          <Button className="shrink-0 gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Portal
          </Button>
        </a>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees',      value: employees.length },
          { label: 'In SyncFlow',          value: employees.filter(e => e.in_syncflow).length },
          { label: 'In TimeWise',          value: employees.filter(e => e.in_timewise).length },
          { label: 'Client Contacts',      value: clients.length },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Global Employees (read-only) ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Employees provisioned via the Platform Portal. Manage them there.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchEmployees} disabled={loadingEmp} className="gap-2">
                <RefreshCw className={`h-3.5 w-3.5 ${loadingEmp ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <a href={`${portalUrl}/employee-management`} target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary" className="gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Add in Portal
                </Button>
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEmp ? (
            <div className="flex h-24 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading employees…
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Badge ID</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sync Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.full_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{emp.badge_id ?? '—'}</TableCell>
                      <TableCell>{emp.designation ?? '—'}</TableCell>
                      <TableCell>{emp.department_name ?? '—'}</TableCell>
                      <TableCell className="text-sm">{emp.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <SyncBadge ok={emp.in_syncflow} label="SyncFlow" />
                          <SyncBadge ok={emp.in_timewise} label="TimeWise" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {employees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No employees found. Create them in the{' '}
                        <a href={`${portalUrl}/employee-management`} target="_blank" rel="noreferrer" className="underline text-primary">
                          Platform Portal
                        </a>
                        .
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Client Stakeholders (SyncFlow-specific, keep CRUD here) ─────────── */}
      {isAdmin && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Client Stakeholders</CardTitle>
                    <CardDescription>
                      Project-specific client contacts. These are SyncFlow-only accounts.
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={handleAddNewClient} size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" /> Add Client
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
                      <TableHead className="text-right w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client, i) => (
                      <TableRow key={client.id || client.email || `c-${i}`}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="text-sm">{client.email}</TableCell>
                        <TableCell><Badge variant="outline">{client.vertex}</Badge></TableCell>
                        <TableCell>{client.designation}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClient(client)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingClient(client)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {clients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No client contacts added yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Client dialog ─────────────────────────────────────────────────── */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit' : 'Add New'} Client</DialogTitle>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-4">
              <FormField control={clientForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="Sarah Connor" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={clientForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="s.connor@cyberdyne.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={clientForm.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Min 6 characters" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={clientForm.control} name="profileImage" render={({ field }) => (
                <FormItem><FormControl><ImageUpload value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={clientForm.control} name="vertex" render={({ field }) => (
                <FormItem><FormLabel>Vertex</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select vertex" /></SelectTrigger></FormControl>
                    <SelectContent>{MOCK_VERTICES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={clientForm.control} name="designation" render={({ field }) => (
                <FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="Project Lead" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit" disabled={clientForm.formState.isSubmitting || loadingCli}>
                  {loadingCli ? <><Loader2 className="animate-spin mr-2 h-4 w-4" />Saving…</> : (editingClient ? 'Save Changes' : 'Add Client')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Delete client confirmation ─────────────────────────────────────── */}
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deletingClient?.name}" from SyncFlow. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Save confirmation ──────────────────────────────────────────────── */}
      <AlertDialog open={!!confirmingSave} onOpenChange={(open) => !open && setConfirmingSave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>Save changes to this client?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmingSave(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
