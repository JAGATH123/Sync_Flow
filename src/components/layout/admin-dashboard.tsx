'use client';

import { useState, useEffect } from 'react';
import type { User, Task, TeamMember } from '@/types';
import { ALL_USERS, MOCK_VERTICES, TEAM_MEMBERS } from '@/lib/mock-data';
import { MOCK_TASKS } from '@/lib/mock-data';
import {
  LayoutDashboard,
  ListChecks,
  FileSpreadsheet,
  PieChart,
  Users,
  FileText,
  TrendingUp,
  Home,
  ArrowLeft,
  Radio,
} from 'lucide-react';
import DashboardPage from '@/components/shared/dashboard-page';
import TaskManagementPage from '@/features/tasks/components/task-management-page';
import CostEstimation from '@/components/shared/cost-estimation';
import Clock from '@/components/layout/clock';
import { cn } from '@/lib/utils';
import UserMenu from '@/components/layout/user-menu';
import OverviewPage from '@/components/shared/overview-page';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import MyTeamPage from '@/features/team/components/my-team-page';
import Notifications from '@/components/layout/notifications';
import ReportsPage from '@/features/reports/components/reports-page';
import EmployeePerformancePage from '@/features/performance/components/employee-performance-page';
import BroadcastingPage from '@/features/broadcasting/components/broadcasting-page';
import { Button } from '@/components/ui/button';
import LiveUsersIndicator from '@/components/layout/live-users-indicator';
import { useRealtime } from '@/lib/realtime';

type AdminView = 'overview' | 'dashboard' | 'task-management' | 'cost-estimation' | 'my-team' | 'reports' | 'performance' | 'broadcasting';

interface AdminDashboardProps {
  currentUser: any; // AuthUser from context
}

export default function AdminDashboard({ currentUser: authUser }: AdminDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [viewHistory, setViewHistory] = useState<AdminView[]>(['overview']);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn('No token found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/tasks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        console.warn('Token expired, clearing auth and redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const result = await response.json();
        setTasks(result.tasks);
      } else {
        console.error('Failed to fetch tasks:', response.status);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    // Initialize other data in sessionStorage if it doesn't exist
    if (!sessionStorage.getItem('vertices')) {
      sessionStorage.setItem('vertices', JSON.stringify(MOCK_VERTICES));
    }

    if (!sessionStorage.getItem('teamMembers')) {
      sessionStorage.setItem('teamMembers', JSON.stringify(TEAM_MEMBERS));
    }

    if (!sessionStorage.getItem('allUsers')) {
      sessionStorage.setItem('allUsers', JSON.stringify(ALL_USERS));
    }

    if (!sessionStorage.getItem('notifications')) {
      sessionStorage.setItem('notifications', JSON.stringify([]));
    }

    // Convert auth user to User type for compatibility
    if (authUser) {
      const userData: User = {
        name: authUser.name,
        email: authUser.email,
        role: authUser.role
      };
      setUser(userData);
    }

    // Fetch tasks from API
    fetchTasks();
  }, [authUser]);

  // Listen for real-time task events
  useEffect(() => {
    const unsubscribe1 = useRealtime('task_created', (event) => {
      console.log('Task created event received in admin:', event);
      fetchTasks(); // Re-fetch tasks when new task is created
    });

    const unsubscribe2 = useRealtime('task_updated', (event) => {
      console.log('Task updated event received in admin:', event);
      fetchTasks(); // Re-fetch tasks when task is updated
    });

    return () => {
      if (typeof unsubscribe1 === 'function') unsubscribe1();
      if (typeof unsubscribe2 === 'function') unsubscribe2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchTasks is stable, no need to add as dependency

  const handleSetView = (view: AdminView) => {
    setViewHistory(prev => [...prev, view]);
    setActiveView(view);
  }

  const handleBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop();
      const previousView = newHistory[newHistory.length - 1];
      setViewHistory(newHistory);
      setActiveView(previousView);
    }
  }

  const updateTasksState = (newTasks: Task[]) => {
    setTasks(newTasks);
    // Also refresh from API to ensure we have the latest data
    fetchTasks();
  };

  const addTask = (newTask: Task) => {
    // Update local state immediately for better UX
    setTasks(prevTasks => [...prevTasks, newTask]);
    // Also refresh from API to ensure we have the latest data
    setTimeout(() => fetchTasks(), 500);
  };

  const updateTask = async (updatedTask: Task) => {
    try {
      const token = localStorage.getItem('token');
      const taskId = updatedTask._id || updatedTask.id;

      if (!taskId) {
        console.error('Task ID is missing for update');
        return;
      }

      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          taskId: taskId,
          progress: updatedTask.progress,
          status: updatedTask.status,
          remarks: updatedTask.remarks,
          actualWorkingHours: updatedTask.actualWorkingHours,
          reviewStatus: updatedTask.reviewStatus,
          priority: updatedTask.priority
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update local state with the response from API
        setTasks(prevTasks =>
          prevTasks.map((task) => {
            const taskIdMatch = task.id === result.task.id ||
                               task._id === result.task._id ||
                               task._id?.toString() === result.task._id?.toString();
            return taskIdMatch ? result.task : task;
          })
        );
      } else {
        console.error('Failed to update task:', await response.text());
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = (taskId: string | string[]) => {
    const idsToDelete = Array.isArray(taskId) ? taskId : [taskId];
    const newTasks = tasks.filter((task) => !idsToDelete.includes(task.id));
    updateTasksState(newTasks);
  };

  const renderContent = () => {
    switch(activeView) {
      case 'overview':
        return <OverviewPage tasks={tasks} />;
      case 'dashboard':
        return <DashboardPage initialTasks={tasks} currentUser={user} />;
      case 'task-management':
        return <TaskManagementPage tasks={tasks} addTask={addTask} updateTask={updateTask} deleteTask={deleteTask} currentUser={user}/>;
      case 'cost-estimation':
        return <CostEstimation currentUser={user} />;
      case 'my-team':
        return <MyTeamPage currentUser={user} />;
      case 'reports':
        return <ReportsPage currentUser={user} />;
      case 'performance':
        return <EmployeePerformancePage currentUser={user} />;
      case 'broadcasting':
        return <BroadcastingPage currentUser={user} />;
      default:
        return <OverviewPage tasks={tasks} />;
    }
  }

  // Don't render if user is not loaded yet
  if (!user) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon">
         <SidebarHeader>
           <div className="flex justify-between items-center p-4">
              <div className="w-32 group-data-[collapsible=icon]:hidden">
                 <h2 className="text-2xl font-bold tracking-wider text-sidebar-foreground">SyncFlow</h2>
              </div>
              <SidebarTrigger />
           </div>
           <div className="px-4 pb-4 group-data-[collapsible=icon]:hidden">
             <div className="h-px bg-border"></div>
           </div>
         </SidebarHeader>
         <SidebarContent>
           <SidebarMenu className="gap-1 px-2">
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('overview')} isActive={activeView === 'overview'} tooltip="Overview">
                <PieChart />
                <span>Overview</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('dashboard')} isActive={activeView === 'dashboard'} tooltip="Dashboard">
                <LayoutDashboard />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('task-management')} isActive={activeView === 'task-management'} tooltip="Task Management">
                <ListChecks />
                <span>Task Management</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('my-team')} isActive={activeView === 'my-team'} tooltip="My Team">
                <Users />
                <span>My Team</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('cost-estimation')} isActive={activeView === 'cost-estimation'} tooltip="Market Price">
                <FileSpreadsheet />
                <span>Market Price</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('reports')} isActive={activeView === 'reports'} tooltip="Reports">
                <FileText />
                <span>Reports</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('performance')} isActive={activeView === 'performance'} tooltip="Performance">
                <TrendingUp />
                <span>Performance</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => handleSetView('broadcasting')} isActive={activeView === 'broadcasting'} tooltip="Broadcasting">
                <Radio />
                <span>Broadcasting</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
         </SidebarContent>
         <SidebarFooter>
            <div className="p-4 group-data-[collapsible=icon]:hidden">
              <div className="flex flex-col items-center justify-center space-y-3">
                <p className="text-sm font-bold text-muted-foreground tracking-widest uppercase font-orbitron">Developed By</p>
                <img
                  src="/LOF_alternate.png"
                  alt="LOF Logo"
                  className="h-12 w-auto object-contain"
                />
              </div>
            </div>
         </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="w-full p-4 sm:p-6">
          <header className="flex justify-between items-center mb-6">
            <Clock />
            <div className="flex items-center gap-4">
              <LiveUsersIndicator />
              <Notifications />
              <UserMenu />
            </div>
          </header>
           <div>
              {renderContent()}
            </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}