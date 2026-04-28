
'use client';

import { useState, useEffect, useMemo, use } from 'react';
import type { Task, Vertices, TaskPriority, User } from '@/types';
import { MOCK_VERTICES } from '@/lib/mock-data';
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
import { ExternalLink, IndianRupee, LayoutGrid, List, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import TaskCard from '@/features/tasks/components/task-card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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

export default function SharedDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [shareData, setShareData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentLayout, setCurrentLayout] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    try {
      const data = sessionStorage.getItem(id);
      if (data) {
        const parsedData = JSON.parse(data);
        setShareData(parsedData);
        setCurrentLayout(parsedData.layout || 'grid');
      } else {
        setError('Shared dashboard not found or has expired.');
      }
    } catch (e) {
      setError('Failed to load shared dashboard data.');
    }
  }, [id]);

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  if (!shareData) {
    return <div className="flex justify-center items-center h-screen">Loading shared dashboard...</div>;
  }

  const { tasks, filters, layout, tasksByVertex, costByVertex, totalCost } = shareData;
  const noTasksFound = tasks.length === 0;
  
  // A dummy user for TaskCard, as it's a read-only view
  const dummyUser: User = { name: 'Guest', email: 'guest@example.com', role: 'client' };

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="w-full space-y-6">
        <div className="px-4">
          <header className="mb-8 bg-card p-6 rounded-lg border shadow-sm">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Shared Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            This is a read-only view of a shared dashboard.
          </p>
          </header>
        </div>

        <div className="px-4">
          <Card>
          <CardHeader>
            <CardTitle>Total Cost Estimation</CardTitle>
            <CardDescription>
                The total estimated cost for the tasks in this shared view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(costByVertex).map(([vertex, cost]) => {
                if (cost === 0) return null;
                return (
                    <div key={vertex} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
                        <IndianRupee className="h-8 w-8 text-primary" />
                        <div>
                        <p className="text-sm text-muted-foreground">{vertex} Total</p>
                        <p className="text-2xl font-bold tracking-tight">
                            ₹{(cost as number).toLocaleString('en-IN')}
                        </p>
                        </div>
                    </div>
                )
                })}
            </div>
            {Object.keys(costByVertex).length > 1 && (
                <>
                <Separator className="my-6" />
                <div className="flex items-center justify-center p-6 bg-secondary rounded-lg">
                    <div className="text-center">
                    <p className="text-base text-muted-foreground font-semibold">Grand Total for All Vertices</p>
                    <p className="text-4xl font-bold tracking-tight text-primary">
                        ₹{totalCost.toLocaleString('en-IN')}
                    </p>
                    </div>
                </div>
                </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              <p><strong>Month:</strong> {filters.selectedMonth === 'all' ? 'All' : new Date(0, filters.selectedMonth - 1).toLocaleString('default', { month: 'long' })}</p>
              <p><strong>Year:</strong> {filters.selectedYear}</p>
              <p><strong>Vertex:</strong> {filters.selectedVertex}</p>
              {filters.searchTerm && <p><strong>Search:</strong> "{filters.searchTerm}"</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant={currentLayout === 'grid' ? 'primary' : 'outline'} size="icon" onClick={() => setCurrentLayout('grid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={currentLayout === 'list' ? 'primary' : 'outline'} size="icon" onClick={() => setCurrentLayout('list')}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {currentLayout === 'grid' ? (
          <>
          {noTasksFound ? (
             <div className="p-8 text-center text-lg text-muted-foreground bg-card rounded-lg shadow-sm">
               No tasks found for the selected filters.
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
              {Object.keys(tasksByVertex).map(vertex => {
                 const tasksForVertex = tasksByVertex[vertex];
                 if (tasksForVertex.length === 0) return null;

                 return (
                <div key={vertex} className="bg-secondary/50 rounded-lg h-full">
                  <div className={cn('p-3 rounded-t-lg border-b-2', vertexColorClasses[vertex as Vertices] || 'bg-gray-100 border-gray-200 dark:bg-gray-900/30 dark:border-gray-800 text-gray-800 dark:text-gray-200')}>
                      <h3 className="text-lg font-semibold">{vertex}</h3>
                      <p className="text-sm font-normal opacity-80">{tasksForVertex?.length || 0} tasks</p>
                  </div>
                  <ScrollArea className="h-full max-h-[calc(100vh-22rem)] p-2">
                     <div className="space-y-4">
                        {tasksForVertex.map((task: Task) => (
                          <TaskCard key={task.id} task={task} currentUser={dummyUser} />
                        ))}
                     </div>
                  </ScrollArea>
                </div>
                 );
              })}
            </div>
          )}
          </>
        ) : (
           <Card>
              <CardContent>
                  <ScrollArea className="h-[calc(100vh-22rem)]">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-[30%]">Task</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>Assignee</TableHead>
                              <TableHead>Dates</TableHead>
                              <TableHead className="w-[15%]">Progress</TableHead>
                              <TableHead>Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {tasks.length > 0 ? (
                             tasks.map((task: Task) => (
                                 <TableRow key={task.id} className={cn('bg-opacity-20 hover:bg-opacity-30', vertexColorClasses[task.vertex as Vertices].replace(/ text-\w+-\d+/g, ''))}>
                                     <TableCell>
                                         <div className="font-medium">{task.name}</div>
                                         <div className="text-xs text-muted-foreground">{task.vertex}</div>
                                     </TableCell>
                                     <TableCell>
                                          <Badge className={cn('text-xs', getPriorityBadgeClass(task.priority))}>
                                              <AlertTriangle className="mr-1 h-3 w-3" />
                                              {task.priority}
                                          </Badge>
                                     </TableCell>
                                     <TableCell>{task.client}</TableCell>
                                     <TableCell>{task.assignedTo}</TableCell>
                                     <TableCell className="text-xs">
                                         <div>Start: {format(parseISO(task.startDate), 'MMM d, yyyy')}</div>
                                         <div>End: {format(parseISO(task.endDate), 'MMM d, yyyy')}</div>
                                     </TableCell>
                                     <TableCell>
                                         <div className="flex items-center gap-2">
                                             <Progress value={task.progress} className="h-2" />
                                             <span className="text-sm font-semibold">{task.progress}%</span>
                                         </div>
                                     </TableCell>
                                     <TableCell>
                                         <Badge variant={task.status === 'Delivered' ? 'default' : 'secondary'} className={cn(task.status === 'Delivered' && 'bg-green-600')}>
                                             {task.status}
                                         </Badge>
                                     </TableCell>
                                 </TableRow>
                             ))
                          ) : (
                              <TableRow>
                                  <TableCell colSpan={7} className="text-center h-24">
                                      No tasks found for the selected filters.
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
      </div>
    </div>
  );
}
