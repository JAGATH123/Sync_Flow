'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Task, Vertices, TaskStatus, User, TeamMember } from '@/types';
import { MOCK_TASKS, TEAM_MEMBERS as INITIAL_TEAM_MEMBERS, MOCK_VERTICES } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts"
import {
    CheckCircle2,
    XCircle,
    PauseCircle,
    PlayCircle,
    Clock,
    CalendarCheck,
    CalendarPlus,
    CalendarClock,
    User as UserIcon,
    ListChecks,
    FolderOpen,
    FolderClosed,
    FileQuestion,
    Sigma,
} from 'lucide-react';
import { parseISO, isBefore, isEqual as isDateEqual, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OverviewPageProps {
  tasks: Task[];
}

const TASK_STATUSES: TaskStatus[] = ['Not Started', 'In Progress', 'On Hold', 'Delivered'];

const getMonths = () => {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));
};

const getYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
};

const STATUS_COLORS: Record<TaskStatus, string> = {
    'Not Started': 'hsl(220 13% 65%)', // Muted foreground
    'In Progress': 'hsl(221 83% 53%)', // Blue
    'On Hold': 'hsl(30 80% 55%)', // Orange
    'Delivered': 'hsl(160 60% 45%)', // Green
};

const chartConfig = {
    tasks: { label: "Tasks" },
    'CMIS': { label: 'CMIS', color: 'hsl(var(--chart-1))' },
    'LOF': { label: 'LOF', color: 'hsl(var(--chart-2))' },
    'TRI': { label: 'TRI', color: 'hsl(var(--chart-3))' },
    'TRG': { label: 'TRG', color: 'hsl(var(--chart-4))' },
    'Not Started': { label: 'Not Started', color: STATUS_COLORS['Not Started'] },
    'In Progress': { label: 'In Progress', color: STATUS_COLORS['In Progress'] },
    'On Hold': { label: 'On Hold', color: STATUS_COLORS['On Hold'] },
    'Delivered': { label: 'Delivered', color: STATUS_COLORS['Delivered'] },
};

const vertexColors: Record<string, string> = {
    'CMIS': 'hsl(var(--chart-1))',
    'LOF': 'hsl(var(--chart-2))',
    'TRI': 'hsl(var(--chart-3))',
    'TRG': 'hsl(var(--chart-4))',
    'VB World': 'hsl(var(--chart-5))',
    'CMG': 'hsl(var(--chart-6))',
    'Jahangir': 'hsl(var(--chart-7))',
    'LOF Curriculum': 'hsl(var(--chart-8))',
};

export default function OverviewPage({ tasks: initialTasks }: OverviewPageProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [selectedVertex, setSelectedVertex] = useState<Vertices | 'all'>('all');
  const [vertices, setVertices] = useState<string[]>(MOCK_VERTICES);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    // Load data from session storage
    const storedTasks = sessionStorage.getItem('tasks');
    const storedVertices = sessionStorage.getItem('vertices');
    const storedMembers = sessionStorage.getItem('teamMembers');

    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
    if (storedVertices) {
      setVertices(JSON.parse(storedVertices));
    }
    if (storedMembers) {
      setTeamMembers(JSON.parse(storedMembers));
    } else {
      setTeamMembers(INITIAL_TEAM_MEMBERS);
    }

    const handleDataChange = () => {
      const updatedTasks = sessionStorage.getItem('tasks');
      const updatedVertices = sessionStorage.getItem('vertices');
      const updatedMembers = sessionStorage.getItem('teamMembers');

      if (updatedTasks) setTasks(JSON.parse(updatedTasks));
      if (updatedVertices) setVertices(JSON.parse(updatedVertices));
      if (updatedMembers) setTeamMembers(JSON.parse(updatedMembers));
    };

    window.addEventListener('tasksChanged', handleDataChange);
    window.addEventListener('verticesChanged', handleDataChange);
    window.addEventListener('teamMembersChanged', handleDataChange);

    return () => {
      window.removeEventListener('tasksChanged', handleDataChange);
      window.removeEventListener('verticesChanged', handleDataChange);
      window.removeEventListener('teamMembersChanged', handleDataChange);
    };
  }, []);

  const monthlyTasks = useMemo(() => {
    return tasks.filter(task => {
      const taskDate = parseISO(task.createdDate);
      const taskMonth = taskDate.getMonth() + 1;
      const taskYear = taskDate.getFullYear();

      const monthMatches = selectedMonth === 'all' || taskMonth === selectedMonth;
      const yearMatches = selectedYear === 'all' || taskYear === selectedYear;
      const vertexMatches = selectedVertex === 'all' || task.vertex === selectedVertex;

      return monthMatches && yearMatches && vertexMatches;
    });
  }, [tasks, selectedMonth, selectedYear, selectedVertex]);

  const pieChartData = useMemo(() => {
    const dataByVertex: Record<Vertices, number> = {} as Record<Vertices, number>;

    vertices.forEach(v => {
      dataByVertex[v] = 0;
    });

    monthlyTasks.forEach(task => {
      if (dataByVertex[task.vertex] !== undefined) {
        dataByVertex[task.vertex]++;
      } else {
        dataByVertex[task.vertex] = 1;
      }
    });

    return Object.entries(dataByVertex)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [monthlyTasks, vertices]);

  const tasksAndStatusByVertices = useMemo(() => {
    const dataByVertex: Record<Vertices, Record<TaskStatus, number>> = {} as Record<Vertices, Record<TaskStatus, number>>;

    vertices.forEach(v => {
      dataByVertex[v] = {
        'Not Started': 0,
        'In Progress': 0,
        'On Hold': 0,
        'Delivered': 0,
      };
    });

    monthlyTasks.forEach(task => {
      if (!dataByVertex[task.vertex]) {
        dataByVertex[task.vertex] = {
          'Not Started': 0,
          'In Progress': 0,
          'On Hold': 0,
          'Delivered': 0,
        };
      }
      dataByVertex[task.vertex][task.status]++;
    });

    const formattedData: Record<Vertices, { status: TaskStatus; tasks: number; }[]> = {} as Record<Vertices, { status: TaskStatus; tasks: number; }[]>;
    for (const vertex of vertices) {
        formattedData[vertex] = TASK_STATUSES.map(status => ({
            status: status,
            tasks: dataByVertex[vertex][status],
        }));
    }
    return formattedData;
  }, [monthlyTasks, vertices]);

  const totalTasks = useMemo(() => {
    return pieChartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [pieChartData]);

  const overallStats = useMemo(() => {
     const stats = {
      total: monthlyTasks.length,
      open: 0,
      closed: 0,
      unassigned: 0,
      onHold: 0,
    };

    for (const task of monthlyTasks) {
        switch(task.status) {
            case 'In Progress':
                stats.open++;
                break;
            case 'Delivered':
                stats.closed++;
                break;
            case 'Not Started':
                stats.unassigned++;
                break;
            case 'On Hold':
                stats.onHold++;
                break;
        }
    }
    return stats;
  }, [monthlyTasks]);

  const statsByVertex = useMemo(() => {
    const initialVertexStats = { open: 0, closed: 0, unassigned: 0, onHold: 0, total: 0 };
    const stats: Record<Vertices, typeof initialVertexStats> = {};

    vertices.forEach(v => {
      stats[v] = { ...initialVertexStats };
    });

    for (const task of monthlyTasks) {
      if (!stats[task.vertex]) {
        stats[task.vertex] = { ...initialVertexStats };
      }
      stats[task.vertex].total++;
      switch (task.status) {
        case 'In Progress':
          stats[task.vertex].open++;
          break;
        case 'Delivered':
          stats[task.vertex].closed++;
          break;
        case 'Not Started':
          stats[task.vertex].unassigned++;
          break;
        case 'On Hold':
          stats[task.vertex].onHold++;
          break;
      }
    }
    return stats;
  }, [monthlyTasks, vertices]);

  const barChartData = useMemo(() => {
    return tasksAndStatusByVertices;
  }, [tasksAndStatusByVertices]);

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Gradient Design */}
      <div className="bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20 rounded-xl p-6 border border-cyan-200 dark:border-cyan-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-cyan-500 to-sky-600 rounded-xl shadow-lg">
              <Sigma className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-sky-600 bg-clip-text text-transparent">
                System Overview
              </h1>
              <p className="text-cyan-700 dark:text-cyan-300 mt-1">
                Comprehensive insights into all projects, tasks, and team performance across all vertices
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-cyan-200 dark:border-cyan-800">
              <div className="text-2xl font-bold text-cyan-600">{monthlyTasks.length}</div>
              <div className="text-xs text-muted-foreground">Total Tasks</div>
            </div>
            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-cyan-200 dark:border-cyan-800">
              <div className="text-2xl font-bold text-sky-600">{monthlyTasks.filter(t => t.status === 'Delivered').length}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Filters</CardTitle>
          <CardDescription>Customize the view by selecting specific time periods and vertices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vertex</label>
              <Select value={selectedVertex} onValueChange={(value) => setSelectedVertex(value as Vertices | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Vertex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vertices</SelectItem>
                  {vertices.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select onValueChange={(val) => setSelectedMonth(val === 'all' ? 'all' : parseInt(val))} value={String(selectedMonth)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {getMonths().map(month => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select onValueChange={(val) => setSelectedYear(val === 'all' ? 'all' : parseInt(val))} value={String(selectedYear)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {getYears().map(year => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Projects"
          value={Object.keys(statsByVertex).length}
          icon={FolderOpen}
          color="text-cyan-600"
        />
        <StatCard
          title="Active Tasks"
          value={overallStats.open}
          icon={PlayCircle}
          color="text-sky-600"
        />
        <StatCard
          title="Completed Tasks"
          value={overallStats.closed}
          icon={CheckCircle2}
          color="text-emerald-600"
        />
        <StatCard
          title="On Hold"
          value={overallStats.onHold}
          icon={PauseCircle}
          color="text-orange-600"
        />
      </div>

      {/* Vertex Overview Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Vertex Overview</CardTitle>
          <CardDescription>Quick overview of each vertex performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(statsByVertex).map(([vertex, stats]) => (
              <div key={vertex} className="p-4 rounded-lg border bg-secondary/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary">
                    <FolderOpen className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{vertex}</h3>
                    <p className="text-xs text-muted-foreground">{stats.total} total tasks</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-medium">{stats.open}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium">{stats.closed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Not Started</span>
                    <span className="font-medium">{stats.unassigned}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">On Hold</span>
                    <span className="font-medium">{stats.onHold}</span>
                  </div>
                  {stats.total > 0 && (
                    <div className="pt-2 mt-2 border-t">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground">Completion</span>
                        <span className="font-medium">
                          {Math.round((stats.closed / stats.total) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 mt-1">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round((stats.closed / stats.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Performance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Task Status Distribution by Vertex</CardTitle>
          <CardDescription>Detailed breakdown of task statuses across different vertices</CardDescription>
        </CardHeader>
        <CardContent>
            {Object.keys(barChartData).map((vertex) => (
                <div key={vertex} className="mb-8 last:mb-0">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: vertexColors[vertex] }}></div>
                        {vertex} ({statsByVertex[vertex]?.total || 0} tasks)
                    </h3>
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                        <BarChart data={barChartData[vertex]} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="tasks" name="Tasks" radius={4}>
                                <LabelList dataKey="tasks" position="top" />
                                {barChartData[vertex].map((entry) => (
                                    <Cell key={`cell-${entry.status}`} fill={STATUS_COLORS[entry.status as TaskStatus]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </div>
            ))}
        </CardContent>
      </Card>

    </div>
  );
}

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
    return (
        <Card className="bg-secondary/50">
            <CardContent className="p-4 flex items-center justify-start gap-4">
                <Icon className={`h-10 w-10 ${color}`} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{title}</p>
                </div>
            </CardContent>
        </Card>
    );
}