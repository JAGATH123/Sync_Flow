
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Task, Vertices, User, TeamMember, TaskStatus, WorkType, UserRole } from '@/types';
import { MOCK_TASKS, MOCK_VERTICES, TEAM_MEMBERS } from '@/lib/mock-data';
import { COST_RATES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, TrendingUp, TrendingDown, Award, Target, Clock, IndianRupee, Users, BarChart3, Activity, Zap, Calendar, CheckCircle2, AlertTriangle, PauseCircle, XCircle, Medal, Trophy, Star, Gauge, Search, X, Download, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, RadialBarChart, RadialBar
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, subDays, isAfter, isBefore, differenceInDays } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Link from 'next/link';
import { useRealtime } from '@/lib/realtime';

interface EmployeePerformancePageProps {
    currentUser: User;
}

// Color schemes for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const STATUS_COLORS = {
  'Delivered': '#10b981',
  'In Progress': '#3b82f6',
  'On Hold': '#f59e0b',
  'Not Started': '#6b7280'
};

interface EmployeeAnalytics {
    name: string;
    empId: string;
    designation: string;
    email: string;

    // Task metrics
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    onHoldTasks: number;
    notStartedTasks: number;

    // Performance metrics
    completionRate: number;
    avgTaskDuration: number;
    onTimeDeliveryRate: number;
    productivityScore: number;
    efficiency: number;

    // Work distribution
    workTypeDistribution: { type: WorkType; count: number; hours: number }[];
    vertexDistribution: { vertex: Vertices; count: number }[];

    // Time & cost metrics
    totalHoursLogged: number;
    estimatedHours: number;
    actualHours: number;
    costGenerated: number;
    avgHoursPerTask: number;

    // Quality metrics
    overdueTasks: number;
    earlyDeliveries: number;
    onTimeDeliveries: number;
    lateDeliveries: number;

    // Trends
    last30DaysCompletion: number;
    last30DaysTasks: number;
    trend: 'up' | 'down' | 'stable';

    user: TeamMember;
}

interface TeamOverview {
    totalMembers: number;
    avgProductivity: number;
    totalTasksCompleted: number;
    totalRevenue: number;
    topPerformer: string;
    improvementNeeded: string[];
}

export default function EmployeePerformancePage({ currentUser }: EmployeePerformancePageProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<EmployeeAnalytics[]>([]);
    const [teamOverview, setTeamOverview] = useState<TeamOverview | null>(null);
    const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | '6m' | '1y'>('30d');
    const [selectedMetric, setSelectedMetric] = useState<'productivity' | 'completion' | 'revenue' | 'efficiency'>('productivity');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchedUser, setSearchedUser] = useState<EmployeeAnalytics | null>(null);

    // Fetch team members from API
    const fetchTeamMembers = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();

            if (data.success) {
                const users = data.users;
                // Convert users to team members format for compatibility
                const members: TeamMember[] = users
                    .filter((user: any) => user.role !== 'client')
                    .map((user: any) => ({
                        name: user.name,
                        empId: user.empId || `EMP-${user.id}`,
                        designation: user.designation || 'Employee',
                        email: user.email,
                        role: user.role,
                        profileImage: user.profileImage
                    }));
                setTeamMembers(members);
                sessionStorage.setItem('teamMembers', JSON.stringify(members));
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
            // Fallback to mock data if API fails
            setTeamMembers(TEAM_MEMBERS);
        }
    };

    // Fetch tasks from API
    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/tasks', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success && data.tasks) {
                setTasks(data.tasks);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            // Fallback to mock data if API fails
            setTasks(MOCK_TASKS);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Fetch tasks from API instead of sessionStorage
        fetchTasks();

        // Load team members from sessionStorage first, then API
        const storedMembers = sessionStorage.getItem('teamMembers');
        if (storedMembers) {
            setTeamMembers(JSON.parse(storedMembers));
        } else {
            fetchTeamMembers();
        }

        // Listen for team member changes
        const handleTeamMemberChange = () => {
            const updatedMembers = sessionStorage.getItem('teamMembers');
            if (updatedMembers) {
                setTeamMembers(JSON.parse(updatedMembers));
            }
        };

        // Listen for task updates to refresh performance data
        const handleTaskUpdate = () => {
            fetchTasks();
        };

        window.addEventListener('teamMembersChanged', handleTeamMemberChange);
        window.addEventListener('tasksChanged', handleTaskUpdate);
        return () => {
            window.removeEventListener('teamMembersChanged', handleTeamMemberChange);
            window.removeEventListener('tasksChanged', handleTaskUpdate);
        };
    }, []);

    // Listen for real-time task events
    useEffect(() => {
        const unsubscribe1 = useRealtime('task_created', (event) => {
            console.log('Task created event received in performance:', event);
            fetchTasks();
        });

        const unsubscribe2 = useRealtime('task_updated', (event) => {
            console.log('Task updated event received in performance:', event);
            fetchTasks();
        });

        const unsubscribe3 = useRealtime('task_deleted', (event) => {
            console.log('Task deleted event received in performance:', event);
            fetchTasks();
        });

        return () => {
            unsubscribe1();
            unsubscribe2();
            unsubscribe3();
        };
    }, []);

    // Helper function to get date range based on timeframe
    const getDateRange = (timeframe: '30d' | '90d' | '6m' | '1y') => {
        const now = new Date();
        switch (timeframe) {
            case '30d': return subDays(now, 30);
            case '90d': return subDays(now, 90);
            case '6m': return subDays(now, 180);
            case '1y': return subDays(now, 365);
        }
    };

    // Advanced analytics calculation
    const calculateAnalytics = useMemo(() => {
        if (!tasks.length || !teamMembers.length) return { analytics: [], teamOverview: null };

        const startDate = getDateRange(selectedTimeframe);
        const filteredTasks = tasks.filter(task =>
            isAfter(parseISO(task.createdDate), startDate)
        );

        // Get only current team members (exclude deleted users)
        const allCurrentMembers = teamMembers.map(m => m.name);

        const employeeAnalytics: EmployeeAnalytics[] = allCurrentMembers.map(assigneeName => {
            const member = teamMembers.find(m => m.name === assigneeName);
            // Match tasks by assignedToName field (not assignedTo which is the ID)
            const memberTasks = filteredTasks.filter(task =>
                (task.assignedToName === assigneeName) ||
                (task.assignedTo === assigneeName)
            );

            // Skip if member not found (safety check)
            if (!member) return null;

            const completedTasks = memberTasks.filter(t => t.status === 'Delivered');
            const inProgressTasks = memberTasks.filter(t => t.status === 'In Progress');
            const onHoldTasks = memberTasks.filter(t => t.status === 'On Hold');
            const notStartedTasks = memberTasks.filter(t => t.status === 'Not Started');

            // Calculate delivery metrics
            const onTimeDeliveries = completedTasks.filter(task => {
                if (!task.completionDate) return false;
                return !isAfter(parseISO(task.completionDate), parseISO(task.endDate));
            });

            const earlyDeliveries = completedTasks.filter(task => {
                if (!task.completionDate) return false;
                return isBefore(parseISO(task.completionDate), parseISO(task.endDate));
            });

            const lateDeliveries = completedTasks.filter(task => {
                if (!task.completionDate) return false;
                return isAfter(parseISO(task.completionDate), parseISO(task.endDate));
            });

            // Calculate hours and costs
            const totalHours = memberTasks.reduce((sum, task) => sum + task.workingHours, 0);
            const totalCost = memberTasks.reduce((sum, task) =>
                sum + (task.workingHours * (COST_RATES[task.typeOfWork as keyof typeof COST_RATES] || 85)), 0);

            // Work type distribution
            const workTypeMap = new Map();
            memberTasks.forEach(task => {
                const existing = workTypeMap.get(task.typeOfWork) || { count: 0, hours: 0 };
                workTypeMap.set(task.typeOfWork, {
                    count: existing.count + 1,
                    hours: existing.hours + task.workingHours
                });
            });

            // Vertex distribution
            const vertexMap = new Map();
            memberTasks.forEach(task => {
                const count = vertexMap.get(task.vertex) || 0;
                vertexMap.set(task.vertex, count + 1);
            });

            // Calculate productivity score (0-100)
            const completionRate = memberTasks.length > 0 ? (completedTasks.length / memberTasks.length) * 100 : 0;
            const onTimeRate = completedTasks.length > 0 ? (onTimeDeliveries.length / completedTasks.length) * 100 : 0;
            const efficiency = totalHours > 0 ? Math.min(100, (completedTasks.length * 8) / totalHours * 100) : 0;
            const productivityScore = (completionRate * 0.4) + (onTimeRate * 0.4) + (efficiency * 0.2);

            // Calculate trends
            const last30DaysTasks = memberTasks.filter(task =>
                isAfter(parseISO(task.createdDate), subDays(new Date(), 30))
            );
            const last30DaysCompleted = last30DaysTasks.filter(t => t.status === 'Delivered');

            return {
                name: member.name,
                empId: member.empId,
                designation: member.designation,
                email: member.email,
                totalTasks: memberTasks.length,
                completedTasks: completedTasks.length,
                inProgressTasks: inProgressTasks.length,
                onHoldTasks: onHoldTasks.length,
                notStartedTasks: notStartedTasks.length,
                completionRate,
                avgTaskDuration: completedTasks.length > 0 ?
                    completedTasks.reduce((sum, task) => {
                        const duration = task.completionDate ?
                            differenceInDays(parseISO(task.completionDate), parseISO(task.startDate)) : 0;
                        return sum + duration;
                    }, 0) / completedTasks.length : 0,
                onTimeDeliveryRate: onTimeRate,
                productivityScore: Math.round(productivityScore),
                efficiency: Math.round(efficiency),
                workTypeDistribution: Array.from(workTypeMap.entries()).map(([type, data]) => ({
                    type: type as WorkType,
                    count: data.count,
                    hours: data.hours
                })),
                vertexDistribution: Array.from(vertexMap.entries()).map(([vertex, count]) => ({
                    vertex: vertex as Vertices,
                    count
                })),
                totalHoursLogged: totalHours,
                estimatedHours: totalHours,
                actualHours: totalHours,
                costGenerated: totalCost,
                avgHoursPerTask: memberTasks.length > 0 ? totalHours / memberTasks.length : 0,
                overdueTasks: memberTasks.filter(task =>
                    task.status !== 'Delivered' && isAfter(new Date(), parseISO(task.endDate))
                ).length,
                earlyDeliveries: earlyDeliveries.length,
                onTimeDeliveries: onTimeDeliveries.length,
                lateDeliveries: lateDeliveries.length,
                last30DaysCompletion: last30DaysCompleted.length,
                last30DaysTasks: last30DaysTasks.length,
                trend: last30DaysCompleted.length > completedTasks.length * 0.3 ? 'up' :
                       last30DaysCompleted.length < completedTasks.length * 0.1 ? 'down' : 'stable',
                user: member
            };
        }).filter(Boolean) as EmployeeAnalytics[]; // Filter out null values

        // Calculate team overview
        const totalCompleted = employeeAnalytics.reduce((sum, emp) => sum + emp.completedTasks, 0);
        const totalRevenue = employeeAnalytics.reduce((sum, emp) => sum + emp.costGenerated, 0);
        const avgProductivity = employeeAnalytics.reduce((sum, emp) => sum + emp.productivityScore, 0) / employeeAnalytics.length;

        const topPerformer = employeeAnalytics.sort((a, b) => b.productivityScore - a.productivityScore)[0]?.name || '';
        const improvementNeeded = employeeAnalytics
            .filter(emp => emp.productivityScore < 60)
            .map(emp => emp.name);

        const teamOverview: TeamOverview = {
            totalMembers: teamMembers.length,
            avgProductivity: Math.round(avgProductivity),
            totalTasksCompleted: totalCompleted,
            totalRevenue,
            topPerformer,
            improvementNeeded
        };

        return { analytics: employeeAnalytics, teamOverview };
    }, [tasks, teamMembers, selectedTimeframe]);

    useEffect(() => {
        setIsLoading(true);
        const { analytics: newAnalytics, teamOverview: newTeamOverview } = calculateAnalytics;
        setAnalytics(newAnalytics);
        setTeamOverview(newTeamOverview);
        setIsLoading(false);
    }, [calculateAnalytics]);

    // Search functionality
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            const foundUser = analytics.find(user =>
                user.name.toLowerCase().includes(query.toLowerCase()) ||
                user.empId.toLowerCase().includes(query.toLowerCase()) ||
                user.email.toLowerCase().includes(query.toLowerCase()) ||
                user.designation.toLowerCase().includes(query.toLowerCase())
            );
            setSearchedUser(foundUser || null);
        } else {
            setSearchedUser(null);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchedUser(null);
    };

    // Download individual employee report
    const downloadEmployeeReport = (employee: EmployeeAnalytics, format: 'excel' | 'pdf') => {
        const reportData = {
            employeeName: employee.name,
            empId: employee.empId,
            designation: employee.designation,
            email: employee.email,
            reportGeneratedOn: new Date().toLocaleDateString(),
            timeframe: selectedTimeframe,

            // Performance Metrics
            productivityScore: employee.productivityScore,
            completionRate: Math.round(employee.completionRate),
            onTimeDeliveryRate: Math.round(employee.onTimeDeliveryRate),
            efficiency: employee.efficiency,

            // Task Statistics
            totalTasks: employee.totalTasks,
            completedTasks: employee.completedTasks,
            inProgressTasks: employee.inProgressTasks,
            onHoldTasks: employee.onHoldTasks,
            notStartedTasks: employee.notStartedTasks,
            overdueTasks: employee.overdueTasks,

            // Time & Delivery Metrics
            avgTaskDuration: Math.round(employee.avgTaskDuration),
            totalHoursLogged: employee.totalHoursLogged,
            avgHoursPerTask: Math.round(employee.avgHoursPerTask),
            earlyDeliveries: employee.earlyDeliveries,
            onTimeDeliveries: employee.onTimeDeliveries,
            lateDeliveries: employee.lateDeliveries,

            // Recent Performance
            last30DaysTasks: employee.last30DaysTasks,
            last30DaysCompletion: employee.last30DaysCompletion,
            trend: employee.trend,
        };

        if (format === 'excel') {
            // Create Excel workbook
            const ws = XLSX.utils.json_to_sheet([
                { Metric: 'Employee Name', Value: reportData.employeeName },
                { Metric: 'Employee ID', Value: reportData.empId },
                { Metric: 'Designation', Value: reportData.designation },
                { Metric: 'Email', Value: reportData.email },
                { Metric: 'Report Generated On', Value: reportData.reportGeneratedOn },
                { Metric: 'Timeframe', Value: reportData.timeframe },
                { Metric: '', Value: '' },
                { Metric: 'PERFORMANCE METRICS', Value: '' },
                { Metric: 'Productivity Score', Value: `${reportData.productivityScore}%` },
                { Metric: 'Completion Rate', Value: `${reportData.completionRate}%` },
                { Metric: 'On-Time Delivery Rate', Value: `${reportData.onTimeDeliveryRate}%` },
                { Metric: 'Efficiency', Value: `${reportData.efficiency}%` },
                { Metric: '', Value: '' },
                { Metric: 'TASK STATISTICS', Value: '' },
                { Metric: 'Total Tasks', Value: reportData.totalTasks },
                { Metric: 'Completed Tasks', Value: reportData.completedTasks },
                { Metric: 'In Progress Tasks', Value: reportData.inProgressTasks },
                { Metric: 'On Hold Tasks', Value: reportData.onHoldTasks },
                { Metric: 'Not Started Tasks', Value: reportData.notStartedTasks },
                { Metric: 'Overdue Tasks', Value: reportData.overdueTasks },
                { Metric: '', Value: '' },
                { Metric: 'TIME & DELIVERY METRICS', Value: '' },
                { Metric: 'Average Task Duration (days)', Value: reportData.avgTaskDuration },
                { Metric: 'Total Hours Logged', Value: reportData.totalHoursLogged },
                { Metric: 'Average Hours Per Task', Value: reportData.avgHoursPerTask },
                { Metric: 'Early Deliveries', Value: reportData.earlyDeliveries },
                { Metric: 'On-Time Deliveries', Value: reportData.onTimeDeliveries },
                { Metric: 'Late Deliveries', Value: reportData.lateDeliveries },
                { Metric: '', Value: '' },
                { Metric: 'RECENT PERFORMANCE', Value: '' },
                { Metric: 'Last 30 Days Tasks', Value: reportData.last30DaysTasks },
                { Metric: 'Last 30 Days Completed', Value: reportData.last30DaysCompletion },
                { Metric: 'Performance Trend', Value: reportData.trend },
            ]);

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Performance Report');

            // Add work type distribution sheet
            if (employee.workTypeDistribution.length > 0) {
                const workTypeWs = XLSX.utils.json_to_sheet(
                    employee.workTypeDistribution.map(wt => ({
                        'Work Type': wt.type,
                        'Task Count': wt.count,
                        'Total Hours': wt.hours
                    }))
                );
                XLSX.utils.book_append_sheet(wb, workTypeWs, 'Work Distribution');
            }

            XLSX.writeFile(wb, `${employee.name.replace(/\s+/g, '_')}_Performance_Report_${selectedTimeframe}.xlsx`);
        } else {
            // Create PDF report
            const doc = new jsPDF();

            // Header
            doc.setFontSize(20);
            doc.setTextColor(59, 130, 246); // Blue color
            doc.text('Employee Performance Report', 14, 20);

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Generated on: ${reportData.reportGeneratedOn}`, 14, 35);
            doc.text(`Timeframe: ${reportData.timeframe}`, 14, 45);

            // Employee Info
            doc.setFontSize(14);
            doc.setTextColor(59, 130, 246);
            doc.text('Employee Information', 14, 60);

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Name: ${reportData.employeeName}`, 14, 75);
            doc.text(`Employee ID: ${reportData.empId}`, 14, 85);
            doc.text(`Designation: ${reportData.designation}`, 14, 95);
            doc.text(`Email: ${reportData.email}`, 14, 105);

            // Performance Metrics Table
            (doc as any).autoTable({
                startY: 120,
                head: [['Performance Metrics', 'Score']],
                body: [
                    ['Productivity Score', `${reportData.productivityScore}%`],
                    ['Completion Rate', `${reportData.completionRate}%`],
                    ['On-Time Delivery Rate', `${reportData.onTimeDeliveryRate}%`],
                    ['Efficiency', `${reportData.efficiency}%`],
                ],
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 80 },
                    1: { cellWidth: 40, halign: 'center' }
                }
            });

            // Task Statistics Table
            (doc as any).autoTable({
                startY: (doc as any).lastAutoTable.finalY + 15,
                head: [['Task Statistics', 'Count']],
                body: [
                    ['Total Tasks', reportData.totalTasks.toString()],
                    ['Completed Tasks', reportData.completedTasks.toString()],
                    ['In Progress Tasks', reportData.inProgressTasks.toString()],
                    ['On Hold Tasks', reportData.onHoldTasks.toString()],
                    ['Not Started Tasks', reportData.notStartedTasks.toString()],
                    ['Overdue Tasks', reportData.overdueTasks.toString()],
                ],
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 80 },
                    1: { cellWidth: 40, halign: 'center' }
                }
            });

            // Time & Delivery Metrics
            (doc as any).autoTable({
                startY: (doc as any).lastAutoTable.finalY + 15,
                head: [['Time & Delivery Metrics', 'Value']],
                body: [
                    ['Average Task Duration', `${reportData.avgTaskDuration} days`],
                    ['Total Hours Logged', `${reportData.totalHoursLogged} hrs`],
                    ['Average Hours Per Task', `${reportData.avgHoursPerTask} hrs`],
                    ['Early Deliveries', reportData.earlyDeliveries.toString()],
                    ['On-Time Deliveries', reportData.onTimeDeliveries.toString()],
                    ['Late Deliveries', reportData.lateDeliveries.toString()],
                ],
                headStyles: { fillColor: [168, 85, 247] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 80 },
                    1: { cellWidth: 40, halign: 'center' }
                }
            });

            doc.save(`${employee.name.replace(/\s+/g, '_')}_Performance_Report_${selectedTimeframe}.pdf`);
        }
    };


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <p>Loading advanced analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Enhanced Header with Key Metrics */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                            <BarChart3 className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Team Performance Analytics
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Advanced insights into team productivity, efficiency, and performance metrics
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    {teamOverview && (
                        <div className="flex gap-4">
                            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border">
                                <div className="text-2xl font-bold text-green-600">{teamOverview.totalMembers}</div>
                                <div className="text-xs text-muted-foreground">Team Members</div>
                            </div>
                            <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border">
                                <div className="text-2xl font-bold text-blue-600">{teamOverview.avgProductivity}%</div>
                                <div className="text-xs text-muted-foreground">Avg Productivity</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Controls */}
            <Card className="border-2 border-dashed">
                <CardHeader className="pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Analytics Dashboard</CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                            <Select value={selectedTimeframe} onValueChange={(value: '30d' | '90d' | '6m' | '1y') => setSelectedTimeframe(value)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="30d">Last 30 days</SelectItem>
                                    <SelectItem value="90d">Last 90 days</SelectItem>
                                    <SelectItem value="6m">Last 6 months</SelectItem>
                                    <SelectItem value="1y">Last year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Enhanced Team Overview Stats with Interactive Insights */}
            {teamOverview && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform duration-300">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Team Productivity</p>
                                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{teamOverview.avgProductivity}%</p>
                                        <div className="mt-2">
                                            <Progress value={teamOverview.avgProductivity} className="h-2 [&>div]:bg-blue-500" />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg">
                                        <TrendingUp className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800 hover:scale-105 transition-transform duration-300">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-600 dark:text-green-400 text-sm font-medium">Tasks Completed</p>
                                        <p className="text-3xl font-bold text-green-900 dark:text-green-100">{teamOverview.totalTasksCompleted}</p>
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            {analytics.reduce((sum, emp) => sum + emp.totalTasks, 0)} total tasks
                                        </p>
                                    </div>
                                    <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-lg">
                                        <CheckCircle2 className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                </div>
            )}

            {/* Performance Analytics Tabs */}
            <Card>
                <CardContent className="p-6">
                    {/* Search Bar */}
                    {/* Enhanced Search & Filter Section */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl border">
                        <div className="flex items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    placeholder="🔍 Search employees by name, ID, email, or designation..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-12 pr-12 h-11 bg-white/80 dark:bg-gray-950/80 border-2 focus:border-primary/50 shadow-sm"
                                />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearSearch}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {searchedUser && (
                                <div className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Showing results for:</span>
                                    <Badge variant="outline" className="font-medium">
                                        {searchedUser.name} ({searchedUser.empId})
                                    </Badge>
                                </div>
                            )}
                        </div>
                        {searchQuery && !searchedUser && (
                            <p className="text-sm text-red-600 mt-2">No employee found matching "{searchQuery}"</p>
                        )}
                    </div>

                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-4 h-12 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-1">
                            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all duration-200">
                                <Activity className="h-4 w-4" />
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="productivity" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all duration-200">
                                <Gauge className="h-4 w-4" />
                                Productivity
                            </TabsTrigger>
                            <TabsTrigger value="efficiency" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all duration-200">
                                <Zap className="h-4 w-4" />
                                Efficiency
                            </TabsTrigger>
                            <TabsTrigger value="detailed" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all duration-200">
                                <BarChart3 className="h-4 w-4" />
                                Detailed
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            {/* Always show Team Overview */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Enhanced Team Performance Chart */}
                                <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500 rounded-lg">
                                                <BarChart3 className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-bold text-blue-900 dark:text-blue-100">Team Performance Comparison</CardTitle>
                                                <CardDescription className="text-blue-700 dark:text-blue-300">Productivity scores across team members</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ResponsiveContainer width="100%" height={320}>
                                            <BarChart data={analytics.slice(0, 8)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.6} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                                                <XAxis
                                                    dataKey="name"
                                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                                    axisLine={{ stroke: '#9ca3af' }}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={80}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                                    axisLine={{ stroke: '#9ca3af' }}
                                                    domain={[0, 100]}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                    formatter={(value: any) => [`${value}%`, 'Productivity Score']}
                                                />
                                                <Bar
                                                    dataKey="productivityScore"
                                                    fill="url(#productivityGradient)"
                                                    radius={[6, 6, 0, 0]}
                                                    strokeWidth={2}
                                                    stroke="#2563eb"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Enhanced Task Status Distribution */}
                                <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/20">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500 rounded-lg">
                                                <Activity className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-bold text-green-900 dark:text-green-100">Task Distribution Overview</CardTitle>
                                                <CardDescription className="text-green-700 dark:text-green-300">Current status of all team tasks</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ResponsiveContainer width="100%" height={320}>
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Completed', value: analytics.reduce((sum, emp) => sum + emp.completedTasks, 0), fill: '#10b981' },
                                                        { name: 'In Progress', value: analytics.reduce((sum, emp) => sum + emp.inProgressTasks, 0), fill: '#3b82f6' },
                                                        { name: 'On Hold', value: analytics.reduce((sum, emp) => sum + emp.onHoldTasks, 0), fill: '#f59e0b' },
                                                        { name: 'Not Started', value: analytics.reduce((sum, emp) => sum + emp.notStartedTasks, 0), fill: '#6b7280' }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={110}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {[
                                                        { name: 'Completed', value: analytics.reduce((sum, emp) => sum + emp.completedTasks, 0), fill: '#10b981' },
                                                        { name: 'In Progress', value: analytics.reduce((sum, emp) => sum + emp.inProgressTasks, 0), fill: '#3b82f6' },
                                                        { name: 'On Hold', value: analytics.reduce((sum, emp) => sum + emp.onHoldTasks, 0), fill: '#f59e0b' },
                                                        { name: 'Not Started', value: analytics.reduce((sum, emp) => sum + emp.notStartedTasks, 0), fill: '#6b7280' }
                                                    ].map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} strokeWidth={2} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                    formatter={(value: any) => [value, 'Tasks']}
                                                />
                                                <Legend
                                                    verticalAlign="bottom"
                                                    height={36}
                                                    iconType="circle"
                                                    wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Task Summary */}
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center justify-between p-2 bg-white/60 dark:bg-gray-900/60 rounded-lg">
                                                <span className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                    Completed
                                                </span>
                                                <span className="font-bold">{analytics.reduce((sum, emp) => sum + emp.completedTasks, 0)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-2 bg-white/60 dark:bg-gray-900/60 rounded-lg">
                                                <span className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                                    Active
                                                </span>
                                                <span className="font-bold">{analytics.reduce((sum, emp) => sum + emp.inProgressTasks, 0)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="productivity" className="space-y-6">
                            {/* Employee Performance Cards - filtered by search */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(searchedUser ? [searchedUser] : analytics)
                                    .sort((a, b) => b.productivityScore - a.productivityScore)
                                    .map((employee, index) => (
                                        <Card key={employee.empId} className="relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/10 dark:to-cyan-950/10">
                                            {index < 3 && (
                                                <div className="absolute top-3 right-3 flex items-center gap-1">
                                                    <div className={`p-2 rounded-full ${
                                                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg' :
                                                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-slate-500 shadow-md' :
                                                        'bg-gradient-to-r from-amber-500 to-yellow-600 shadow-md'
                                                    }`}>
                                                        {index === 0 && <Trophy className="h-4 w-4 text-white" />}
                                                        {index === 1 && <Medal className="h-4 w-4 text-white" />}
                                                        {index === 2 && <Award className="h-4 w-4 text-white" />}
                                                    </div>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                                        index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' :
                                                        index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200' :
                                                        'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                                                    }`}>
                                                        #{index + 1}
                                                    </span>
                                                </div>
                                            )}
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <Avatar className={`h-14 w-14 ring-4 shadow-lg ${
                                                            employee.productivityScore >= 80 ? 'ring-green-300' :
                                                            employee.productivityScore >= 60 ? 'ring-blue-300' :
                                                            'ring-red-300'
                                                        }`}>
                                                            <AvatarImage src={employee.user.profileImage || `https://i.pravatar.cc/150?u=${employee.email}`} />
                                                            <AvatarFallback className="font-bold text-white text-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                                                                {employee.name.split(' ').map(n => n[0]).join('')}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md bg-blue-500">
                                                            {employee.productivityScore}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="space-y-1">
                                                            <CardTitle className="text-lg flex items-center gap-2 group">
                                                                <span className="group-hover:text-primary transition-colors">{employee.name}</span>
                                                                <div className="flex items-center gap-1">
                                                                    {employee.trend === 'up' && (
                                                                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                                            <TrendingUp className="h-3 w-3 text-green-600" />
                                                                            <span className="text-xs font-medium text-green-700 dark:text-green-400">Rising</span>
                                                                        </div>
                                                                    )}
                                                                    {employee.trend === 'down' && (
                                                                        <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                                                                            <TrendingDown className="h-3 w-3 text-red-600" />
                                                                            <span className="text-xs font-medium text-red-700 dark:text-red-400">Declining</span>
                                                                        </div>
                                                                    )}
                                                                    {employee.trend === 'stable' && (
                                                                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-900/30 rounded-full">
                                                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-400">Stable</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </CardTitle>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <span>{employee.designation}</span>
                                                                <Badge variant="outline" className="text-xs px-2 py-0">
                                                                    {employee.empId}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {/* Productivity Score with Enhanced Visualization */}
                                                <div className="space-y-3 p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg border">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-semibold flex items-center gap-2">
                                                            <Gauge className="h-4 w-4 text-primary" />
                                                            Productivity Score
                                                        </span>
                                                        <div className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                                            {employee.productivityScore}%
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <Progress
                                                            value={employee.productivityScore}
                                                            className="h-3 transition-all duration-500 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-cyan-600"
                                                        />
                                                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                                                            <span>0%</span>
                                                            <span className="font-medium">Performance Level</span>
                                                            <span>100%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Enhanced Key Metrics Grid */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Target className="h-3 w-3 text-blue-600" />
                                                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Completion</p>
                                                        </div>
                                                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{Math.round(employee.completionRate)}%</p>
                                                    </div>
                                                    <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Clock className="h-3 w-3 text-blue-600" />
                                                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">On-Time</p>
                                                        </div>
                                                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{Math.round(employee.onTimeDeliveryRate)}%</p>
                                                    </div>
                                                    <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Tasks</p>
                                                        </div>
                                                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{employee.completedTasks}<span className="text-sm text-muted-foreground">/{employee.totalTasks}</span></p>
                                                    </div>
                                                    <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <IndianRupee className="h-3 w-3 text-blue-600" />
                                                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Revenue</p>
                                                        </div>
                                                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                                            {(employee.costGenerated / 1000).toFixed(0)}k
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Enhanced Status Indicators */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {employee.overdueTasks > 0 && (
                                                        <Badge variant="destructive" className="text-xs px-2 py-1 animate-pulse">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            {employee.overdueTasks} Overdue
                                                        </Badge>
                                                    )}
                                                    {employee.inProgressTasks > 0 && (
                                                        <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                                            <Activity className="h-3 w-3 mr-1" />
                                                            {employee.inProgressTasks} Active
                                                        </Badge>
                                                    )}
                                                    {employee.onHoldTasks > 0 && (
                                                        <Badge variant="outline" className="text-xs px-2 py-1 border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                            <PauseCircle className="h-3 w-3 mr-1" />
                                                            {employee.onHoldTasks} On Hold
                                                        </Badge>
                                                    )}
                                                    {employee.completedTasks > 0 && employee.overdueTasks === 0 && (
                                                        <Badge variant="outline" className="text-xs px-2 py-1 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                            <Star className="h-3 w-3 mr-1" />
                                                            High Performer
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Download Report Section */}
                                                <div className="mt-4 p-3 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Download Report</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => downloadEmployeeReport(employee, 'excel')}
                                                                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 hover:border-green-400 px-3 py-1.5 h-auto text-xs font-semibold transition-all duration-200"
                                                            >
                                                                <Download className="h-3 w-3 mr-1.5" />
                                                                Excel
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => downloadEmployeeReport(employee, 'pdf')}
                                                                className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300 hover:border-red-400 px-3 py-1.5 h-auto text-xs font-semibold transition-all duration-200"
                                                            >
                                                                <Download className="h-3 w-3 mr-1.5" />
                                                                PDF
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="efficiency" className="space-y-6">
                            {/* Always show Team Efficiency */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Efficiency vs Completion Rate */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Efficiency vs Completion Rate</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={analytics}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                <YAxis />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="efficiency" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                                                <Area type="monotone" dataKey="completionRate" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Work Distribution */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Work Type Distribution</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {['Design', 'Development', 'QA', 'Marketing'].map((workType) => {
                                                const total = analytics.reduce((sum, emp) => {
                                                    const workTypeData = emp.workTypeDistribution.find(w => w.type === workType);
                                                    return sum + (workTypeData?.count || 0);
                                                }, 0);
                                                const percentage = analytics.length > 0 ? (total / analytics.reduce((sum, emp) => sum + emp.totalTasks, 0)) * 100 : 0;

                                                return (
                                                    <div key={workType} className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium">{workType}</span>
                                                            <span className="text-sm text-muted-foreground">{total} tasks ({Math.round(percentage)}%)</span>
                                                        </div>
                                                        <Progress value={percentage} className="h-2" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="detailed" className="space-y-6">
                            {/* Detailed Performance Table - filtered by search */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Detailed Performance Metrics</CardTitle>
                                    <CardDescription>
                                        {searchedUser
                                            ? `Performance details for ${searchedUser.name}`
                                            : "Comprehensive breakdown of all team members' performance indicators"
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left p-2 font-medium">Employee</th>
                                                    <th className="text-center p-2 font-medium">Productivity</th>
                                                    <th className="text-center p-2 font-medium">Completion</th>
                                                    <th className="text-center p-2 font-medium">On-Time</th>
                                                    <th className="text-center p-2 font-medium">Efficiency</th>
                                                    <th className="text-center p-2 font-medium">Revenue</th>
                                                    <th className="text-center p-2 font-medium">Avg Hours</th>
                                                    <th className="text-center p-2 font-medium">Overdue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(searchedUser ? [searchedUser] : analytics)
                                                    .sort((a, b) => b.productivityScore - a.productivityScore)
                                                    .map((employee) => (
                                                        <tr key={employee.empId} className="border-b hover:bg-muted/50">
                                                            <td className="p-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarImage src={employee.user.profileImage || `https://i.pravatar.cc/150?u=${employee.email}`} />
                                                                        <AvatarFallback className="text-xs">
                                                                            {employee.name.split(' ').map(n => n[0]).join('')}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <p className="font-medium text-sm">{employee.name}</p>
                                                                        <p className="text-xs text-muted-foreground">{employee.designation}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="text-center p-2">
                                                                <Badge variant={employee.productivityScore >= 80 ? 'default' : employee.productivityScore >= 60 ? 'secondary' : 'destructive'}>
                                                                    {employee.productivityScore}%
                                                                </Badge>
                                                            </td>
                                                            <td className="text-center p-2 text-sm">{Math.round(employee.completionRate)}%</td>
                                                            <td className="text-center p-2 text-sm">{Math.round(employee.onTimeDeliveryRate)}%</td>
                                                            <td className="text-center p-2 text-sm">{employee.efficiency}%</td>
                                                            <td className="text-center p-2 text-sm">
                                                                <div className="flex items-center justify-center">
                                                                    <IndianRupee className="h-3 w-3 mr-1" />
                                                                    {(employee.costGenerated / 1000).toFixed(0)}k
                                                                </div>
                                                            </td>
                                                            <td className="text-center p-2 text-sm">{Math.round(employee.avgHoursPerTask)}h</td>
                                                            <td className="text-center p-2">
                                                                {employee.overdueTasks > 0 ? (
                                                                    <Badge variant="destructive" className="text-xs">
                                                                        {employee.overdueTasks}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-green-600 text-sm">✓</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
