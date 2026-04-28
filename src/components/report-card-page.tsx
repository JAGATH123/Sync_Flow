
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Task, Vertices, User, ClientStakeholder, TeamMember, TaskStatus } from '@/types';
import { MOCK_TASKS, MOCK_VERTICES, MOCK_CLIENTS, TEAM_MEMBERS } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, Loader2, Sigma, User as UserIcon, FolderOpen, CheckCircle, PauseCircle } from 'lucide-react';
import { format, parseISO, differenceInBusinessDays, isBefore, isEqual as isDateEqual } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';


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

interface EmployeeReportData {
    assignee: TeamMember;
    vertices: string[];
    taskCount: number;
    totalHours: number;
    statusCounts: Record<TaskStatus, number>;
}

export default function ReportsPage({ currentUser }: ReportsPageProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [vertices, setVertices] = useState<Vertices[]>(MOCK_VERTICES);
    const [clients, setClients] = useState<ClientStakeholder[]>(MOCK_CLIENTS);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(TEAM_MEMBERS);

    const [selectedVertex, setSelectedVertex] = useState<Vertices | 'all'>('all');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<ReportData[]>([]);
    const [employeeReportData, setEmployeeReportData] = useState<EmployeeReportData[]>([]);

    useEffect(() => {
        const storedTasks = sessionStorage.getItem('tasks');
        setTasks(storedTasks ? JSON.parse(storedTasks) : MOCK_TASKS);
    }, []);
    

    const handleGenerateReport = () => {
        setIsLoading(true);

        const filteredTasks = tasks.filter(task => {
            const taskStartDate = parseISO(task.startDate);
            const matchesVertex = selectedVertex === 'all' || task.vertex === selectedVertex;
            const matchesMonth = taskStartDate.getMonth() + 1 === selectedMonth;
            const matchesYear = taskStartDate.getFullYear() === selectedYear;
            return matchesVertex && matchesMonth && matchesYear;
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
        
        const employeeData: Record<string, Omit<EmployeeReportData, 'assignee'>> = {};

        filteredTasks.forEach(task => {
            if (!employeeData[task.assignedTo]) {
                employeeData[task.assignedTo] = {
                    vertices: [],
                    taskCount: 0,
                    totalHours: 0,
                    statusCounts: { 'Not Started': 0, 'In Progress': 0, 'On Hold': 0, 'Delivered': 0 },
                };
            }
            const report = employeeData[task.assignedTo];
            report.taskCount++;
            report.totalHours += task.actualWorkingHours || task.workingHours;
            if (!report.vertices.includes(task.vertex)) {
                report.vertices.push(task.vertex);
            }
            report.statusCounts[task.status]++;
        });
        
        const employeeReports: EmployeeReportData[] = Object.entries(employeeData).map(([assigneeName, data]) => ({
            assignee: teamMembers.find(m => m.name === assigneeName)!,
            ...data
        })).filter(r => r.assignee);


        setReportData(data);
        setEmployeeReportData(employeeReports);
        setIsLoading(false);
    };

    const handleDownloadExcel = () => {
        const mainWorksheet = XLSX.utils.json_to_sheet(reportData);
        const employeeWorksheetData = employeeReportData.map(e => ({
            'Assignee Name': e.assignee.name,
            'Vertices': e.vertices.join(', '),
            'Total Tasks': e.taskCount,
            'Total Hours': e.totalHours,
            'Tasks Delivered': e.statusCounts['Delivered'],
            'Tasks In Progress': e.statusCounts['In Progress'],
            'Tasks On Hold': e.statusCounts['On Hold'],
            'Tasks Not Started': e.statusCounts['Not Started'],
        }));
        const employeeWorksheet = XLSX.utils.json_to_sheet(employeeWorksheetData);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Tasks Report');
        XLSX.utils.book_append_sheet(workbook, employeeWorksheet, 'Employee Summary');

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

        doc.addPage();
        doc.text('Employee Performance Summary', 14, 16);
        (doc as any).autoTable({
            startY: 20,
            head: [['Assignee', 'Vertices', 'Tasks', 'Hours', 'Delivered', 'In Progress', 'On Hold']],
            body: employeeReportData.map(e => [
                e.assignee.name,
                e.vertices.join(', '),
                e.taskCount,
                e.totalHours,
                e.statusCounts['Delivered'],
                e.statusCounts['In Progress'],
                e.statusCounts['On Hold'],
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [34, 128, 195] },
        });

        doc.save(`Task_Report_${selectedVertex}_${selectedMonth}-${selectedYear}.pdf`);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6" />
                        <div>
                            <CardTitle>Reports</CardTitle>
                            <CardDescription>Generate and download monthly task reports for each vertex.</CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-secondary/50 rounded-lg">
                    <Select value={selectedVertex} onValueChange={(v) => setSelectedVertex(v as Vertices | 'all')}>
                        <SelectTrigger><SelectValue placeholder="Select Vertex" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Vertices</SelectItem>
                            {vertices.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={String(selectedMonth)} onValueChange={(m) => setSelectedMonth(Number(m))}>
                        <SelectTrigger><SelectValue placeholder="Select Month" /></SelectTrigger>
                        <SelectContent>
                            {getMonths().map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={String(selectedYear)} onValueChange={(y) => setSelectedYear(Number(y))}>
                        <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                        <SelectContent>
                            {getYears().map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate Report'}
                    </Button>
                </div>

                {reportData.length > 0 && (
                    <div>
                        <div className="mb-6 p-4 border rounded-lg bg-background flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Report Summary</h3>
                                <p className="text-sm text-muted-foreground">
                                    For {selectedVertex === 'all' ? 'All Vertices' : selectedVertex}, {getMonths().find(m => m.value === selectedMonth)?.label} {selectedYear}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 bg-secondary/50 p-3 rounded-md">
                                <Sigma className="h-8 w-8 text-primary" />
                                <div>
                                    <p className="text-2xl font-bold">{reportData.length}</p>
                                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mb-4">
                            <Button variant="outline" onClick={handleDownloadExcel}><Download className="mr-2 h-4 w-4" /> Excel</Button>
                            <Button variant="outline" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" /> PDF</Button>
                        </div>
                        <ScrollArea className="h-[60vh] border rounded-lg">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead>Task Name</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Start</TableHead>
                                        <TableHead>End</TableHead>
                                        <TableHead>Work Days</TableHead>
                                        <TableHead>Work Hours</TableHead>
                                        <TableHead>Assignee</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Delivery Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{row.taskName}</TableCell>
                                            <TableCell>{row.createdDate}</TableCell>
                                            <TableCell>{row.startDate}</TableCell>
                                            <TableCell>{row.endDate}</TableCell>
                                            <TableCell>{row.workingDays}</TableCell>
                                            <TableCell>{row.workingHours}</TableCell>
                                            <TableCell>{row.assignee}</TableCell>
                                            <TableCell>{row.dueDate}</TableCell>
                                            <TableCell>{row.deliveryDate}</TableCell>
                                            <TableCell>{row.completionStatus}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}
                 {reportData.length === 0 && !isLoading && (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <p>No data for the selected period. Generate a report to see results.</p>
                    </div>
                 )}

                {employeeReportData.length > 0 && (
                    <div className="mt-8">
                        <Separator />
                        <div className="mt-8">
                             <CardHeader className="px-0">
                                <CardTitle>Employee Performance Summary</CardTitle>
                                <CardDescription>A summary of each employee's workload for the selected period.</CardDescription>
                            </CardHeader>
                            <div className="space-y-4">
                                {employeeReportData.map(report => (
                                    <Card key={report.assignee.empId}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={`https://i.pravatar.cc/150?u=${report.assignee.email}`} />
                                                    <AvatarFallback>{report.assignee.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">{report.assignee.name}</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {report.vertices.map(v => <Badge key={v} variant="outline">{v}</Badge>)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 text-center">
                                                <div>
                                                    <p className="font-bold text-2xl">{report.taskCount}</p>
                                                    <p className="text-xs text-muted-foreground">Total Tasks</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-2xl">{report.totalHours}</p>
                                                    <p className="text-xs text-muted-foreground">Total Hours</p>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-left pl-6 border-l">
                                                    <p className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> {report.statusCounts.Delivered} Delivered</p>
                                                    <p className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-blue-500" /> {report.statusCounts['In Progress']} In Progress</p>
                                                    <p className="flex items-center gap-2"><PauseCircle className="h-4 w-4 text-yellow-500" /> {report.statusCounts['On Hold']} On Hold</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
