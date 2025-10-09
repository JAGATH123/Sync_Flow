
import { add } from 'date-fns';
import type { Task, User, Project, TeamMember, ClientStakeholder } from './types';

export const PMO_MEMBERS: User[] = [
  { name: 'Admin', email: 'admin@taskflow.com', role: 'admin' },
];

export const TEAM_MEMBERS: TeamMember[] = [
  { name: 'Alex Johnson', email: 'alex.j@taskflow.com', role: 'user', empId: 'AJ001', designation: 'Sr. Developer' },
  { name: 'Maria Garcia', email: 'maria.g@taskflow.com', role: 'user', empId: 'MG002', designation: 'UI/UX Designer' },
  { name: 'James Smith', email: 'james.s@taskflow.com', role: 'user', empId: 'JS003', designation: 'QA Engineer' },
  { name: 'Priya Patel', email: 'priya.p@taskflow.com', role: 'user', empId: 'PP004', designation: 'Jr. Developer' },
  { name: 'Chen Wei', email: 'chen.w@taskflow.com', role: 'user', empId: 'CW005', designation: 'Project Manager' },
];

export const CLIENT_USERS: User[] = [
    { name: 'Client Viewer', email: 'client@example.com', role: 'client'},
    { name: 'John Doe', email: 'john.d@customer.com', role: 'client'},
    { name: 'Jane Smith', email: 'jane.s@customer.com', role: 'client'},
    { name: 'Sam Wilson', email: 'sam.w@customer.com', role: 'client' },
    { name: 'Brie Larson', email: 'brie.l@customer.com', role: 'client' },
];

export const ALL_USERS: User[] = [...PMO_MEMBERS, ...TEAM_MEMBERS, ...CLIENT_USERS];

export let MOCK_VERTICES: string[] = ["CMIS", "LOF", "TRI", "TRG", "VB World", "CMG", "Jahangir", "LOF Curriculum"];

export const MOCK_CLIENTS: ClientStakeholder[] = [
    { id: 'client-1', name: 'John Doe', email: 'john.d@customer.com', vertex: 'CMIS', designation: 'Project Sponsor' },
    { id: 'client-2', name: 'Jane Smith', email: 'jane.s@customer.com', vertex: 'LOF', designation: 'Marketing Lead' },
    { id: 'client-3', name: 'Sam Wilson', email: 'sam.w@customer.com', vertex: 'TRI', designation: 'Operations Head' },
    { id: 'client-4', name: 'Brie Larson', email: 'brie.l@customer.com', vertex: 'TRG', designation: 'Creative Director' },
];


// Mock data for initial state
const today = new Date();
export const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    name: 'Make social media plan',
    assignedTo: 'Alex Johnson',
    assigneeEmail: 'alex.j@taskflow.com',
    status: 'Delivered',
    progress: 100,
    startDate: today.toISOString().split('T')[0],
    endDate: add(today, { weeks: 1 }).toISOString().split('T')[0],
    createdDate: add(today, { days: -2 }).toISOString().split('T')[0],
    client: 'Marketing Team',
    clientEmail: 'marketing@example.com',
    vertex: 'CMIS',
    typeOfWork: 'Development',
    category: 'New Feature',
    workingHours: 40,
    actualWorkingHours: 25,
    priority: 'High',
    remarks: 'Initial timeline extended due to additional API requirements from the client.',
    completionDate: today.toISOString().split('T')[0],
    reviewStatus: 'Manager review',
  },
   {
    id: 'task-2',
    name: 'Create copy for Campaign',
    assignedTo: 'Maria Garcia',
    assigneeEmail: 'maria.g@taskflow.com',
    status: 'In Progress',
    progress: 50,
    startDate: add(today, { weeks: 1 }).toISOString().split('T')[0],
    endDate: add(today, { weeks: 2 }).toISOString().split('T')[0],
    createdDate: add(today, { days: -2 }).toISOString().split('T')[0],
    client: 'Marketing Team',
    clientEmail: 'marketing@example.com',
    vertex: 'CMIS',
    typeOfWork: 'Development',
    category: 'New Feature',
    workingHours: 40,
    actualWorkingHours: 31,
    priority: 'Medium',
  },
  {
    id: 'task-3',
    name: 'Design website',
    assignedTo: 'Priya Patel',
    assigneeEmail: 'priya.p@taskflow.com',
    status: 'Delivered',
    progress: 100,
    startDate: add(today, {days: -10}).toISOString().split('T')[0],
    endDate: add(today, {days: -5}).toISOString().split('T')[0],
    createdDate: add(today, { days: -12 }).toISOString().split('T')[0],
    completionDate: add(today, {days: -6}).toISOString().split('T')[0],
    client: 'Marketing Head',
    clientEmail: 'marketing.head@example.com',
    vertex: 'TRG',
    typeOfWork: 'Marketing',
    category: 'Enhancement',
    workingHours: 60,
    actualWorkingHours: 62,
    priority: 'High',
    reviewStatus: 'Signed off',
  },
  {
    id: 'task-4',
    name: 'Update landing page',
    assignedTo: 'James Smith',
    assigneeEmail: 'james.s@taskflow.com',
    status: 'On Hold',
    progress: 20,
    startDate: add(today, {days: 2}).toISOString().split('T')[0],
    endDate: add(today, {days: 7}).toISOString().split('T')[0],
    createdDate: add(today, { days: -1 }).toISOString().split('T')[0],
    client: 'Product Manager',
    clientEmail: 'pm@example.com',
    vertex: 'LOF',
    typeOfWork: 'QA',
    category: 'Bug Fix',
    workingHours: 24,
    actualWorkingHours: 28,
    priority: 'Low',
  },
];

export const MOCK_PROJECTS: Project[] = [
    {
        id: 'proj-1',
        name: 'Storytelling Inc.',
        tasks: MOCK_TASKS,
    },
    {
        id: 'proj-2',
        name: 'The Factory Workshop LLC.',
        tasks: [
            {
                id: 'task-5',
                name: 'Improve email marketing flow',
                assignedTo: 'Chen Wei',
                assigneeEmail: 'chen.w@taskflow.com',
                status: 'Delivered',
                progress: 100,
                startDate: add(today, {days: 1}).toISOString().split('T')[0],
                endDate: add(today, {days: 10}).toISOString().split('T')[0],
                createdDate: today.toISOString().split('T')[0],
                client: 'Design Lead',
                clientEmail: 'design.lead@example.com',
                vertex: 'TRI',
                typeOfWork: 'Design',
                category: 'Graphics Designing',
                workingHours: 50,
                actualWorkingHours: 52,
                priority: 'Medium',
            },
             {
                id: 'task-6',
                name: 'Create PR package',
                assignedTo: 'Alex Johnson',
                assigneeEmail: 'alex.j@taskflow.com',
                status: 'On Hold',
                progress: 20,
                startDate: add(today, {days: 1}).toISOString().split('T')[0],
                endDate: add(today, {days: 10}).toISOString().split('T')[0],
                createdDate: today.toISOString().split('T')[0],
                client: 'Marketing Team',
                clientEmail: 'marketing@example.com',
                vertex: 'TRI',
                typeOfWork: 'Marketing',
                category: 'Flyer',
                workingHours: 30,
                actualWorkingHours: 30,
                priority: 'High',
            },
        ]
    }
]
