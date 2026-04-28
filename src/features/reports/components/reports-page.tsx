
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Task, Vertices, User, ClientStakeholder, TeamMember, TaskStatus } from '@/types';
import { MOCK_TASKS, MOCK_VERTICES, MOCK_CLIENTS, TEAM_MEMBERS } from '@/lib/mock-data';
import { TASK_STATUSES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Loader2, BarChart3, TrendingUp, Calendar, Clock, Users, Target, CheckCircle, PauseCircle, Sigma, FolderOpen } from 'lucide-react';
import { format, parseISO, differenceInBusinessDays, isBefore, isEqual as isDateEqual } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';


interface ReportsPageProps {
    currentUser: User;
}

const getMonths = () => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
const getYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
};

interface ReportData {
    taskName: string;
    createdDate: string;
    startDate: string;
    endDate: string;
    workingDays: number;
    workingHours: number;
    assignee: string;
    dueDate: string;
    deliveryDate: string;
    completionStatus: string;
}

export default function ReportsPage({ currentUser }: ReportsPageProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [vertices, setVertices] = useState<Vertices[]>(MOCK_VERTICES);

    const [selectedVertex, setSelectedVertex] = useState<Vertices | 'all'>('all');
    const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<ReportData[]>([]);

    useEffect(() => {
        const storedTasks = sessionStorage.getItem('tasks');
        setTasks(storedTasks ? JSON.parse(storedTasks) : MOCK_TASKS);

        // Load vertices from session storage
        const storedVertices = sessionStorage.getItem('vertices');
        if (storedVertices) {
            setVertices(JSON.parse(storedVertices));
        }

        // Listen for vertex changes to stay synchronized with other pages
        const handleVertexChange = () => {
            const updatedVertices = sessionStorage.getItem('vertices');
            if (updatedVertices) {
                const newVertices = JSON.parse(updatedVertices);
                setVertices(newVertices);

                // Reset filter if selected vertex was deleted
                if (selectedVertex !== 'all' && !newVertices.includes(selectedVertex)) {
                    setSelectedVertex('all');
                }
            }
        };

        window.addEventListener('verticesChanged', handleVertexChange);
        return () => {
            window.removeEventListener('verticesChanged', handleVertexChange);
        };
    }, [selectedVertex]);
    

    const handleGenerateReport = () => {
        setIsLoading(true);

        const filteredTasks = tasks.filter(task => {
            const taskStartDate = parseISO(task.startDate);
            const matchesVertex = selectedVertex === 'all' || task.vertex === selectedVertex;
            const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
            const matchesMonth = taskStartDate.getMonth() + 1 === selectedMonth;
            const matchesYear = taskStartDate.getFullYear() === selectedYear;
            return matchesVertex && matchesMonth && matchesYear && matchesStatus;
        });

        const data: ReportData[] = filteredTasks.map(task => {
            let completionStatus = 'N/A';
            if (task.status === 'Delivered' && task.completionDate) {
                const endDate = parseISO(task.endDate);
                const completionDate = parseISO(task.completionDate);
                if (isBefore(completionDate, endDate)) completionStatus = 'Early';
                else if (isDateEqual(completionDate, endDate)) completionStatus = 'On Time';
                else completionStatus = 'Late';
            }

            return {
                taskName: task.name,
                createdDate: format(parseISO(task.createdDate), 'MMM d, yyyy'),
                startDate: format(parseISO(task.startDate), 'MMM d, yyyy'),
                endDate: format(parseISO(task.endDate), 'MMM d, yyyy'),
                workingDays: differenceInBusinessDays(parseISO(task.endDate), parseISO(task.startDate)),
                workingHours: task.actualWorkingHours || task.workingHours,
                assignee: task.assignedTo,
                dueDate: format(parseISO(task.endDate), 'MMM d, yyyy'),
                deliveryDate: task.completionDate ? format(parseISO(task.completionDate), 'MMM d, yyyy') : 'N/A',
                completionStatus: completionStatus,
            };
        });

        setReportData(data);
        setIsLoading(false);
    };

    const handleDownloadExcel = () => {
        const mainWorksheet = XLSX.utils.json_to_sheet(reportData);
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Tasks Report');

        XLSX.writeFile(workbook, `Task_Report_${selectedVertex}_${selectedMonth}-${selectedYear}.xlsx`);
    };

    const handleDownloadPdf = () => {
        const doc = new jsPDF();
        doc.text('Monthly Task Report', 14, 16);
        (doc as any).autoTable({
            startY: 20,
            head: [['Task Name', 'Created', 'Start', 'End', 'Days', 'Hours', 'Assignee', 'Due', 'Delivered', 'Status']],
            body: reportData.map(d => [d.taskName, d.createdDate, d.startDate, d.endDate, d.workingDays, d.workingHours, d.assignee, d.dueDate, d.deliveryDate, d.completionStatus]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [34, 128, 195] },
        });
        
        doc.save(`Task_Report_${selectedVertex}_${selectedMonth}-${selectedYear}.pdf`);
    };

    return (
        <div className="space-y-9">
            {/* Professional Header with Sophisticated Design */}
            <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/30 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl border border-blue-500/20">
                            <BarChart3 className="h-9 w-9 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-700 dark:from-slate-200 dark:to-blue-400 bg-clip-text text-transparent">
                                Reports & Analytics
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300 mt-2 text-lg font-medium">
                                Generate comprehensive task reports and download detailed analytics
                            </p>
                        </div>
                    </div>

                    {/* Enhanced Quick Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-600/50 shadow-sm backdrop-blur-sm">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tasks.length}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Tasks</div>
                        </div>
                        <div className="text-center p-4 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-600/50 shadow-sm backdrop-blur-sm">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{vertices.length}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Vertices</div>
                        </div>
                        <div className="text-center p-4 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-600/50 shadow-sm backdrop-blur-sm">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{tasks.filter(t => t.status === 'Delivered').length}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed</div>
                        </div>
                        <div className="text-center p-4 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-600/50 shadow-sm backdrop-blur-sm">
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{tasks.filter(t => t.status === 'In Progress').length}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">In Progress</div>
                        </div>
                    </div>
                </div>
            </div>

            <Card className="shadow-lg border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
            <CardHeader className="pb-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/30">
                            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">Report Generator</CardTitle>
                            <CardDescription className="text-slate-600 dark:text-slate-400 text-base mt-1">
                                Generate comprehensive task reports with advanced filtering and export options.
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Professional Filter Section */}
                <div className="mb-8 p-6 bg-gradient-to-br from-slate-50/80 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-700/30 border border-slate-200/60 dark:border-slate-600/40 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md">
                            <Sigma className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Advanced Filters
                        </h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-300 to-transparent dark:from-slate-600 ml-4"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Target className="h-4 w-4 text-blue-600" />
                                Vertex
                            </label>
                            <Select value={selectedVertex} onValueChange={(v) => setSelectedVertex(v as Vertices | 'all')}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm h-11 rounded-lg">
                                    <SelectValue placeholder="Select Vertex" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Vertices</SelectItem>
                                    {vertices.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                Status
                            </label>
                            <Select value={selectedStatus} onValueChange={(s) => setSelectedStatus(s as TaskStatus | 'all')}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm h-11 rounded-lg">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Calendar className="h-4 w-4 text-indigo-600" />
                                Month
                            </label>
                            <Select value={String(selectedMonth)} onValueChange={(m) => setSelectedMonth(Number(m))}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm h-11 rounded-lg">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getMonths().map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Clock className="h-4 w-4 text-purple-600" />
                                Year
                            </label>
                            <Select value={String(selectedYear)} onValueChange={(y) => setSelectedYear(Number(y))}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm h-11 rounded-lg">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getYears().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button
                            onClick={handleGenerateReport}
                            disabled={isLoading}
                            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-10 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-base font-semibold"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                    Generating Report...
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="mr-3 h-5 w-5" />
                                    Generate Report
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {reportData.length > 0 && (
                    <div className="space-y-6">
                        {/* Professional Report Summary */}
                        <div className="p-8 bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl shadow-lg">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg border border-emerald-400/20">
                                        <CheckCircle className="h-7 w-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                            Report Generated Successfully
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">
                                            {selectedVertex === 'all' ? 'All Vertices' : selectedVertex} • {getMonths().find(m => m.value === selectedMonth)?.label} {selectedYear} • {selectedStatus === 'all' ? 'All Statuses' : selectedStatus}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200/60 dark:border-blue-700/40 shadow-sm">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reportData.length}</div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">Total Tasks</div>
                                    </div>
                                    <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl border border-emerald-200/60 dark:border-emerald-700/40 shadow-sm">
                                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{reportData.filter(r => r.completionStatus === 'Early' || r.completionStatus === 'On Time').length}</div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">On Time</div>
                                    </div>
                                    <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200/60 dark:border-red-700/40 shadow-sm">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{reportData.filter(r => r.completionStatus === 'Late').length}</div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">Late</div>
                                    </div>
                                    <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl border border-amber-200/60 dark:border-amber-700/40 shadow-sm">
                                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{reportData.reduce((sum, r) => sum + r.workingHours, 0)}</div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">Total Hours</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Enhanced Download Section */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 p-6 bg-gradient-to-br from-slate-50/80 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-700/30 rounded-xl border border-slate-200/60 dark:border-slate-600/40 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200/50 dark:border-blue-700/30">
                                    <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Export Report</h4>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Download your comprehensive report in multiple formats</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadExcel}
                                    className="bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-700 border-emerald-300 hover:border-emerald-400 shadow-sm px-6 py-2.5 rounded-lg font-semibold"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Excel (.xlsx)
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadPdf}
                                    className="bg-gradient-to-br from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-700 border-red-300 hover:border-red-400 shadow-sm px-6 py-2.5 rounded-lg font-semibold"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    PDF (.pdf)
                                </Button>
                            </div>
                        </div>
                        <div className="border border-slate-200/60 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-lg bg-white dark:bg-slate-900">
                            <div className="overflow-x-auto">
                                <Table className="w-full min-w-[1200px]">
                                <TableHeader className="bg-gradient-to-r from-slate-100 via-blue-50/50 to-indigo-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
                                    <TableRow className="border-b border-slate-200/80 dark:border-slate-600/50">
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 py-4 px-6">Task Name</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 py-4 px-4">Created</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 py-4 px-4">Start</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 py-4 px-4">End</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-center py-4 px-4">Work Days</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-center py-4 px-4">Work Hours</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 py-4 px-4">Assignee</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 py-4 px-4">Due Date</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 py-4 px-4">Delivery Date</TableHead>
                                        <TableHead className="font-bold text-slate-800 dark:text-slate-200 text-center py-4 px-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.map((row, index) => (
                                        <TableRow
                                            key={index}
                                            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/30'} border-b border-slate-200/40 dark:border-slate-700/40`}
                                        >
                                            <TableCell className="font-semibold text-blue-600 dark:text-blue-400 py-4 px-6">{row.taskName}</TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300 font-medium py-4 px-4">{row.createdDate}</TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300 font-medium py-4 px-4">{row.startDate}</TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300 font-medium py-4 px-4">{row.endDate}</TableCell>
                                            <TableCell className="text-center font-bold text-slate-800 dark:text-slate-200 py-4 px-4">{row.workingDays}</TableCell>
                                            <TableCell className="text-center font-bold text-slate-800 dark:text-slate-200 py-4 px-4">{row.workingHours}</TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300 font-medium py-4 px-4">{row.assignee}</TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300 font-medium py-4 px-4">{row.dueDate}</TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300 font-medium py-4 px-4">{row.deliveryDate}</TableCell>
                                            <TableCell className="text-center py-4 px-6">
                                                {row.completionStatus !== 'N/A' && (
                                                    <Badge
                                                        className={`font-semibold px-3 py-1 rounded-full ${
                                                            row.completionStatus === 'Early'
                                                                ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300'
                                                                : row.completionStatus === 'On Time'
                                                                ? 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 border border-emerald-300'
                                                                : row.completionStatus === 'Late'
                                                                ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                                                                : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 border border-slate-300'
                                                        }`}
                                                    >
                                                        {row.completionStatus}
                                                    </Badge>
                                                )}
                                                {row.completionStatus === 'N/A' && (
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
        </div>
    );
}
