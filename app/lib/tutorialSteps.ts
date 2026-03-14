export interface TutorialStepDef {
  id: number;
  page: "dashboard" | "deal-detail";
  title: string;
  description: string;
  actionLabel: string;
  /** If true, step auto-advances when user performs the action (no button click needed) */
  autoAdvance?: boolean;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 1,
    page: "dashboard",
    title: "Welcome to JustHouses!",
    description: "Let's set up your first property in about 2 minutes. Everything you enter is real \u2014 you'll keep it.",
    actionLabel: "Start",
  },
  {
    id: 2,
    page: "dashboard",
    title: "Create your first deal",
    description: "Click the '+ New Property' button above to create your first deal.",
    actionLabel: "Waiting...",
    autoAdvance: true,
  },
  {
    id: 3,
    page: "deal-detail",
    title: "Name your property",
    description: "Give this property a name and address so you can identify it in your pipeline.",
    actionLabel: "Next",
  },
  {
    id: 4,
    page: "deal-detail",
    title: "Enter the purchase price",
    description: "What did you pay (or plan to pay) for this property? Open the Analysis tab and enter it in the Acquisition section.",
    actionLabel: "Next",
  },
  {
    id: 5,
    page: "deal-detail",
    title: "Add a room to renovate",
    description: "In the Analysis tab, scroll to Rooms and add your first room \u2014 try 'Kitchen' or 'Main Bathroom'.",
    actionLabel: "Next",
  },
  {
    id: 6,
    page: "deal-detail",
    title: "Check your profit projection",
    description: "Your profit is calculated automatically from purchase price, renovation costs, and expected sale price. You can keep adding rooms, expenses, and milestones.",
    actionLabel: "Next",
  },
  {
    id: 7,
    page: "deal-detail",
    title: "You're all set!",
    description: "Here's where to find everything:",
    actionLabel: "Got it",
  },
];

/** Simplified welcome for roles that can't create deals */
export const NON_CREATOR_WELCOME = {
  title: "Welcome to JustHouses!",
  description: "Your workspace is set up. Check 'My Work' for your assigned tasks and milestones.",
  actionLabel: "Got it",
};

export const TUTORIAL_FINAL_TIPS = [
  { label: "Pipeline", description: "All your property deals in one view", href: "/pipeline" },
  { label: "Finance", description: "Expenses, invoices, and budgets", href: "/finance" },
  { label: "Settings", description: "Team, preferences, and integrations", href: "/settings" },
];
