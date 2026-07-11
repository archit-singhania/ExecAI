import {
  Coins,
  Cpu,
  Megaphone,
  Scale,
  Target,
  TrendingUp,
  Users,
  Gauge,
  CalendarClock,
  BadgeDollarSign,
} from "lucide-react";

export type TrialSuggestion = {
  id: string;
  title: string;
  pitch: string;
  prompt: string;
  agent: string;
  icon: React.ElementType;
  tone: string;
};

export const trialSuggestions: TrialSuggestion[] = [
  {
    id: "validate-idea",
    title: "Validate a new product idea",
    pitch: "Pressure-test demand before you spend a cent building.",
    prompt: "Challenge my idea and tell me if the demand is real before I build anything.",
    agent: "Market Research",
    icon: TrendingUp,
    tone: "bg-basil/10 text-basil",
  },
  {
    id: "runway-check",
    title: "Run a CFO runway check",
    pitch: "See exactly how your spend maps to runway.",
    prompt: "Review my budget and tell me how many months of runway I actually have.",
    agent: "CFO",
    icon: Coins,
    tone: "bg-ember/10 text-ember",
  },
  {
    id: "scope-mvp",
    title: "Scope an MVP with the CTO",
    pitch: "Find the narrowest build that still proves real value.",
    prompt: "Help me scope the smallest possible version of my product that still proves value.",
    agent: "CTO",
    icon: Cpu,
    tone: "bg-ink/10 text-ink",
  },
  {
    id: "pilot-list",
    title: "Build a sales pilot list",
    pitch: "Chase willingness to pay, not just interest.",
    prompt: "Help me build a pilot customer list and a plan to get them to pay.",
    agent: "Sales",
    icon: Users,
    tone: "bg-basil/10 text-basil",
  },
  {
    id: "launch-plan",
    title: "Get a launch marketing plan",
    pitch: "A focused go-to-market for week one.",
    prompt: "Give me a 7-day launch marketing plan with one channel and one message.",
    agent: "Marketing",
    icon: Megaphone,
    tone: "bg-steel/10 text-steel",
  },
  {
    id: "competitive-scan",
    title: "Run a competitive analysis",
    pitch: "See exactly where you're exposed.",
    prompt: "Analyze my top competitors and tell me where I'm exposed.",
    agent: "Market Research",
    icon: Target,
    tone: "bg-basil/10 text-basil",
  },
  {
    id: "board-verdict",
    title: "Simulate a full board meeting",
    pitch: "Get the CEO's verdict across every function at once.",
    prompt: "Run a full board meeting on my plan and give me the final verdict.",
    agent: "CEO",
    icon: Gauge,
    tone: "bg-chartreuse/25 text-ink",
  },
  {
    id: "hiring-plan",
    title: "Draft a hiring plan",
    pitch: "Who to hire next quarter, and why.",
    prompt: "Tell me who I should hire next quarter given my current stage and budget.",
    agent: "CFO",
    icon: CalendarClock,
    tone: "bg-ember/10 text-ember",
  },
  {
    id: "pricing-test",
    title: "Pressure-test your pricing",
    pitch: "Find out if you're leaving money on the table.",
    prompt: "Review my pricing and tell me if it's too low or too high for this market.",
    agent: "CFO",
    icon: BadgeDollarSign,
    tone: "bg-ember/10 text-ember",
  },
  {
    id: "weekly-review",
    title: "Get a weekly board review",
    pitch: "A sample of the ongoing check-in format.",
    prompt: "Give me this week's board review: what changed, what's blocked, what's next.",
    agent: "Legal",
    icon: Scale,
    tone: "bg-ink/10 text-ink",
  },
];
