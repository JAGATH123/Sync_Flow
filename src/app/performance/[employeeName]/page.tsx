
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import type { Task, TaskStatus } from '@/lib/types';
import { MOCK_TASKS } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const getStatusBadgeClass = (status: TaskStatus) => {
    switch(status) {
      case 'Delivered': return 'bg-green-500 text-white';
      case 'In Progress': return 'bg-blue-500 text-white';
      case 'On Hold': return 'bg-yellow-500 text-black';
      case 'Not Started': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
}

export default function EmployeeTasksPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [employeeName, setEmployeeName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const name = Array.isArray(params.employeeName) ? params.employeeName[0] : params.employeeName;
        const decodedName = decodeURIComponent(name || '');
        setEmployeeName(decodedName);

        const month = searchParams.get('month');
        const year = searchParams.get('year');
        
        if (!decodedName || !month || !year) {
            setIsLoading(false);
            return;
        }

        const storedTasks = sessionStorage.getItem('tasks');
        const allTasks = storedTasks ? JSON.parse(storedTasks) : MOCK_TASKS;

        const filteredTasks = allTasks.filter((task: Task) => {
            const taskStartDate = new Date(task.startDate);
            const matchesEmployee = task.assignedTo === decodedName;
            const matchesMonth = taskStartDate.getMonth() + 1 === parseInt(month, 10);
            const matchesYear = taskStartDate.getFullYear() === parseInt(year, 10);
            return matchesEmployee && matchesMonth && matchesYear;
        });

        setTasks(filteredTasks);
        setIsLoading(false);
    }, [params, searchParams]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!employeeName) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-red-500">Employee not found.</p>
            </div>
        );
    }
    
    const monthLabel = new Date(0, Number(searchParams.get('month')) - 1).toLocaleString('default', { month: 'long' });
    const yearLabel = searchParams.get('year');


    return (
        <div className="p-4 sm:p-6 md:p-8">
            <Button asChild variant="outline" size="sm" className="mb-6">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Performance
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Tasks for {employeeName}</CardTitle>
                    <CardDescription>
                        Showing all tasks assigned to {employeeName} for {monthLabel} {yearLabel}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60%]">Task Name</TableHead>
                                    <TableHead>Vertex</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.length > 0 ? (
                                    tasks.map(task => (
                                        <TableRow key={task.id}>
                                            <TableCell className="font-medium">{task.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{task.vertex}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(getStatusBadgeClass(task.status))}>
                                                    {task.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">
                                            No tasks found for this employee in the selected period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
