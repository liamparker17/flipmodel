import type { TourStep } from "../components/SpotlightTour";
import type { OrgRole } from "../types/org";

const executiveSteps: TourStep[] = [
  {
    selector: '[data-tour="nav-dashboard"]',
    title: "Your Command Center",
    description: "Portfolio KPIs, action items, and cash flow at a glance",
    position: "right",
  },
  {
    selector: '[data-tour="nav-pipeline"]',
    title: "Deal Pipeline",
    description: "Track properties from lead to sold",
    position: "right",
  },
  {
    selector: '[data-tour="nav-finance"]',
    title: "Finance Hub",
    description: "Expenses, P&L, and budget tracking",
    position: "right",
  },
  {
    selector: '[data-tour="nav-reports"]',
    title: "Reports & Analytics",
    description: "Portfolio-wide insights and trends",
    position: "right",
  },
  {
    selector: '[data-tour="quick-actions"]',
    title: "Quick Actions",
    description: "Shortcuts to common tasks",
    position: "bottom",
  },
];

const projectManagerSteps: TourStep[] = [
  {
    selector: '[data-tour="nav-projects"]',
    title: "Project Management",
    description: "Manage renovations — milestones, tasks, contractors",
    position: "right",
  },
  {
    selector: '[data-tour="nav-assignments"]',
    title: "My Work",
    description: "Your assigned milestones and tasks across all projects",
    position: "right",
  },
  {
    selector: '[data-tour="nav-contractors"]',
    title: "Contractors",
    description: "Track contractor assignments and costs",
    position: "right",
  },
  {
    selector: '[data-tour="nav-pipeline"]',
    title: "Deal Pipeline",
    description: "Move deals through stages",
    position: "right",
  },
  {
    selector: '[data-tour="new-deal"]',
    title: "New Property",
    description: "Start tracking a new property here",
    position: "bottom",
  },
];

const siteSupervisorSteps: TourStep[] = [
  {
    selector: '[data-tour="nav-assignments"]',
    title: "My Work",
    description: "All your assigned milestones and tasks in one place",
    position: "right",
  },
  {
    selector: '[data-tour="nav-projects"]',
    title: "Projects",
    description: "View project details and update progress",
    position: "right",
  },
  {
    selector: '[data-tour="nav-tools"]',
    title: "Tool Locker",
    description: "Check tools in and out",
    position: "right",
  },
  {
    selector: 'input[type="checkbox"]',
    title: "Complete Tasks",
    description: "Tap to mark tasks complete as you go",
    position: "right",
  },
];

const financeManagerSteps: TourStep[] = [
  {
    selector: '[data-tour="nav-finance"]',
    title: "Finance",
    description: "Full expense tracking and P&L",
    position: "right",
  },
  {
    selector: '[data-tour="nav-invoices"]',
    title: "Invoices",
    description: "Create and manage invoices",
    position: "right",
  },
  {
    selector: '[data-tour="nav-reports"]',
    title: "Reports",
    description: "Portfolio analytics and financial summaries",
    position: "right",
  },
  {
    selector: '[data-tour="nav-dashboard"]',
    title: "Dashboard",
    description: "Quick overview of the portfolio",
    position: "right",
  },
];

const viewerSteps: TourStep[] = [
  {
    selector: '[data-tour="nav-dashboard"]',
    title: "Dashboard",
    description: "Overview of portfolio status",
    position: "right",
  },
  {
    selector: '[data-tour="nav-assignments"]',
    title: "My Work",
    description: "Read-only access to projects",
    position: "right",
  },
];

const fieldWorkerSteps: TourStep[] = [
  {
    selector: '[data-tour="nav-dashboard"]',
    title: "Dashboard",
    description: "Overview of portfolio status",
    position: "right",
  },
  {
    selector: '[data-tour="nav-assignments"]',
    title: "My Work",
    description: "Tasks assigned to you",
    position: "right",
  },
];

export function getStepsForRole(role: OrgRole): TourStep[] {
  switch (role) {
    case "executive":
      return executiveSteps;
    case "project_manager":
      return projectManagerSteps;
    case "site_supervisor":
      return siteSupervisorSteps;
    case "finance_manager":
      return financeManagerSteps;
    case "viewer":
      return viewerSteps;
    case "field_worker":
      return fieldWorkerSteps;
    default:
      return executiveSteps;
  }
}
