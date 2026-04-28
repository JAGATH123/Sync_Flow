
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
} from 'lucide-react';
import DashboardPage from './dashboard-page';
import TaskManagementPage from './task-management-page';
import CostEstimation from './cost-estimation';
import Clock from './clock';
import { cn } from '@/lib/utils';
import UserMenu from './user-menu';
import OverviewPage from './overview-page';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from './ui/sidebar';
import Image from 'next/image';
import MyTeamPage from './my-team-page';
import Notifications from './notifications';
import ReportsPage from './reports-page';
import EmployeePerformancePage from './employee-performance-page';
import { Button } from './ui/button';
import LiveUsersIndicator from './live-users-indicator';
import { usePathname } from 'next/navigation';

type ActiveView = 'overview' | 'dashboard' | 'task-management' | 'cost-estimation' | 'my-team' | 'reports' | 'performance';

interface TaskFlowPageProps {
  currentUser: any; // AuthUser from context
}

export default function TaskFlowPage({ currentUser: authUser }: TaskFlowPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [viewHistory, setViewHistory] = useState<ActiveView[]>(['overview']);

  useEffect(() => {
    // Load tasks from API
    const loadTasks = async () => {
      try {
        const response = await fetch('/api/tasks');
        const data = await response.json();

        if (data.success && data.tasks) {
          // Convert API tasks to frontend format
          const formattedTasks = data.tasks.map((task: any) => ({
            ...task,
            id: task._id,
            assignedTo: task.assignedToName || task.assignedTo?.name || task.assignedTo,
            startDate: task.startDate ? task.startDate.split('T')[0] : '',
            endDate: task.endDate ? task.endDate.split('T')[0] : '',
            createdDate: task.createdDate ? task.createdDate.split('T')[0] : new Date().toISOString().split('T')[0],
            completionDate: task.completionDate ? task.completionDate.split('T')[0] : undefined
          }));
          setTasks(formattedTasks);
        } else {
          // Fallback to mock data if API fails
          if (!sessionStorage.getItem('tasks')) {
            sessionStorage.setItem('tasks', JSON.stringify(MOCK_TASKS));
          }
          setTasks(JSON.parse(sessionStorage.getItem('tasks')!));
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
        // Fallback to mock data if API fails
        if (!sessionStorage.getItem('tasks')) {
          sessionStorage.setItem('tasks', JSON.stringify(MOCK_TASKS));
        }
        setTasks(JSON.parse(sessionStorage.getItem('tasks')!));
      }
    };

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
      const user: User = {
        name: authUser.name,
        email: authUser.email,
        role: authUser.role
      };
      setCurrentUser(user);
      loadTasks();
    }

  }, [authUser]);

  const handleSetView = (view: ActiveView) => {
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
    sessionStorage.setItem('tasks', JSON.stringify(newTasks));
    window.dispatchEvent(new Event('tasksChanged'));
  };

  const addTask = async (newTask: Task) => {
    const newTasks = [...tasks, newTask];
    updateTasksState(newTasks);
  };

  const updateTask = async (updatedTask: Task) => {
    const newTasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
    updateTasksState(newTasks);
  };

  const deleteTask = async (taskId: string | string[]) => {
    const idsToDelete = Array.isArray(taskId) ? taskId : [taskId];
    const newTasks = tasks.filter((task) => !idsToDelete.includes(task.id));
    updateTasksState(newTasks);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isClient = currentUser?.role === 'client';
  const isUser = currentUser?.role === 'user';
  
  const renderContent = () => {
    switch(activeView) {
      case 'overview':
        return <OverviewPage tasks={tasks} />;
      case 'dashboard':
        return <DashboardPage initialTasks={tasks} currentUser={currentUser} />;
      case 'task-management':
        if (isClient) return null;
        return <TaskManagementPage tasks={tasks} addTask={addTask} updateTask={updateTask} deleteTask={deleteTask} currentUser={currentUser}/>;
      case 'cost-estimation':
        if (isUser) return null;
        return <CostEstimation currentUser={currentUser} />;
      case 'my-team':
        if (isClient) return null;
        return <MyTeamPage currentUser={currentUser} />;
      case 'reports':
        if (!isAdmin) return null;
        return <ReportsPage currentUser={currentUser} />;
      case 'performance':
        if (!isAdmin) return null;
        return <EmployeePerformancePage currentUser={currentUser} />;
      default:
        return <OverviewPage tasks={tasks} />;
    }
  }
  
  const shouldShowLiveIndicator = isAdmin && (activeView === 'overview' || activeView === 'dashboard');

  // Don't render if currentUser is not loaded yet
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
    <div className="min-h-screen bg-secondary/40 flex">
      <Sidebar side="left" className="w-64" collapsible="icon">
         <SidebarHeader>
           <div className="flex justify-between items-center p-4">
              <div className="w-32 group-data-[collapsible=icon]:hidden">
                 <h2 className="text-2xl font-bold tracking-wider text-sidebar-foreground">TOPROCK</h2>
              </div>
              <SidebarTrigger />
           </div>
         </SidebarHeader>
         <SidebarContent>
           <SidebarMenu>
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
            {!isClient && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleSetView('task-management')} isActive={activeView === 'task-management'} tooltip="Task Management">
                  <ListChecks />
                  <span>Task Management</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {!isClient && (
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => handleSetView('my-team')} isActive={activeView === 'my-team'} tooltip="My Team">
                      <Users />
                      <span>My Team</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
            )}
             {(isAdmin || isClient) && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleSetView('cost-estimation')} isActive={activeView === 'cost-estimation'} tooltip="Market Price">
                  <FileSpreadsheet />
                  <span>Market Price</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {isAdmin && (
              <>
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
              </>
            )}
           </SidebarMenu>
         </SidebarContent>
         <SidebarFooter>
            <div className="p-4 group-data-[collapsible=icon]:hidden">
              <Clock />
            </div>
         </SidebarFooter>
      </Sidebar>

      <main className="flex-1">
        <div className="w-full p-4 sm:p-6 lg:p-20">
          <header className="flex justify-end">
            <div className="flex items-center gap-4">
              {shouldShowLiveIndicator && <LiveUsersIndicator />}
              <Notifications />
              <UserMenu />
            </div>
          </header>
           <div className="mt-6">
              {renderContent()}
            </div>
        </div>
      </main>
    </div>
    </SidebarProvider>
  );
}
