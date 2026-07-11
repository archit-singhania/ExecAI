import {
  Coins,
  Cpu,
  Megaphone,
  Scale,
  Target,
  TimerReset,
  TrendingUp,
  Users,
  WandSparkles,
} from "lucide-react";
import { AgentReport, Memory, Task } from "@/lib/api";

export const starterPrompts = [
  "I have $25,000 (€23K / £20K / ₹20L). I want to start an online business.",
  "Challenge my idea: an AI resume builder for new grads.",
  "Create a 30-day launch plan for a micro SaaS.",
];

export const agentMeta: Record<string, { icon: React.ElementType; tone: string; orbit: string }> = {
  "Market Research": { icon: TrendingUp, tone: "bg-basil/10 text-basil", orbit: "Demand" },
  CFO: { icon: Coins, tone: "bg-ember/10 text-ember", orbit: "Runway" },
  CTO: { icon: Cpu, tone: "bg-ink/10 text-ink", orbit: "Build" },
  "Product Manager": { icon: Target, tone: "bg-chartreuse/25 text-ink", orbit: "Scope" },
  Marketing: { icon: Megaphone, tone: "bg-steel/10 text-steel", orbit: "Growth" },
  Legal: { icon: Scale, tone: "bg-ink/10 text-ink", orbit: "Risk" },
  Sales: { icon: Users, tone: "bg-basil/10 text-basil", orbit: "Pilots" },
  Designer: { icon: WandSparkles, tone: "bg-ember/10 text-ember", orbit: "UX" },
  "Executive Assistant": { icon: TimerReset, tone: "bg-chartreuse/25 text-ink", orbit: "Rhythm" },
};

export const operatingPhases = [
  "Core chat",
  "Agent graph",
  "Long-term memory",
  "Reports",
  "Voice",
  "Board meetings",
];

export type TaskFilter = "All" | "Open" | "Done" | "High";

export type DashboardTab = "chat" | "agents" | "tasks" | "board" | "operations";

export const fallbackReports: AgentReport[] = [
  {
    agent: "Market Research",
    report_type: "agent",
    title: "Demand exists, but niche selection matters",
    summary: "Start with a painful, frequent workflow for one customer segment before broad automation.",
    bullets: ["Interview users already paying with time or money.", "Reject broad markets until there is a sharper wedge."],
    score: 84,
  },
  {
    agent: "CFO",
    report_type: "agent",
    title: "Keep first validation under $2,500 (€2.3K / £2K / ₹2L)",
    summary: "Spend on interviews, landing page tests, and one paid channel experiment before product build.",
    bullets: ["Cap validation spend.", "Define CAC ceiling before ads."],
    score: 78,
  },
  {
    agent: "CTO",
    report_type: "agent",
    title: "Ship the narrowest workflow first",
    summary: "Build the loop that proves repeat value: input, CEO decision, report, task, and memory.",
    bullets: ["Instrument conversion.", "Avoid background automation until board review works."],
    score: 86,
  },
];

export const fallbackTasks: Task[] = [
  {
    id: "1",
    title: "Interview 10 target customers",
    description: "Capture exact pain language and willingness to pay.",
    priority: "High",
    status: "Not started",
    created_by_agent: "Market Research",
    completed_at: null,
  },
  {
    id: "2",
    title: "Draft landing page offer",
    description: "Test one audience and one promise.",
    priority: "High",
    status: "Ready",
    created_by_agent: "Marketing",
    completed_at: null,
  },
  {
    id: "3",
    title: "List 5 competitor pricing models",
    description: "Look for pricing gaps and weak reviews.",
    priority: "Medium",
    status: "Ready",
    created_by_agent: "CFO",
    completed_at: null,
  },
];

export const fallbackMemories: Memory[] = [
  {
    id: "memory-1",
    kind: "decision",
    content: "The CEO will block full product buildout until validation evidence exists.",
    importance: 0.9,
    created_at: new Date().toISOString(),
  },
  {
    id: "memory-2",
    kind: "strategy",
    content: "The strongest wedge is a narrow, painful workflow with clear willingness to pay.",
    importance: 0.8,
    created_at: new Date().toISOString(),
  },
];

export const demoBoardReply =
  "Here's how the boardroom would open this up: Market Research would pressure-test demand with real interviews before any build, CFO would cap validation spend and track runway, and CTO would scope the narrowest workflow that still proves repeat value. Sign up free to run this for real, with memory, tasks, and weekly board reviews.";

export const demoBoardMeeting: AgentReport = {
  agent: "CEO",
  report_type: "board",
  title: "Board review \u2014 demo mode",
  summary: "This is a sample board review. Sign up free to generate real weekly reviews grounded in your session's memory and tasks.",
  bullets: [
    "Validation spend is on pace, keep it under the CFO's ceiling.",
    "CTO's narrow workflow is still the right first build.",
    "Book five more customer interviews before widening scope.",
  ],
  score: 81,
};

