import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { Page } from "../components/layout/Layout";
import { Badge, Card, PageTitle } from "../components/ui";
import { ROADMAP, type PhaseStatus } from "../data/roadmap";

const STATUS: Record<PhaseStatus, { label: string; tone: "up" | "gold" | "info" | "mute"; icon: React.ReactNode }> = {
  done: { label: "Done", tone: "up", icon: <CheckCircle2 className="size-5 text-up" /> },
  now: { label: "Now", tone: "gold", icon: <CircleDot className="size-5 text-gold" /> },
  next: { label: "Next", tone: "info", icon: <Circle className="size-5 text-info" /> },
  later: { label: "Later", tone: "mute", icon: <Circle className="size-5 text-dim" /> },
};

export function RoadmapList() {
  return (
    <ol className="relative space-y-5 before:absolute before:top-3 before:bottom-3 before:left-[9px] before:w-px before:bg-line">
      {ROADMAP.map((phase) => {
        const s = STATUS[phase.status];
        return (
          <li key={phase.title} className="relative pl-10">
            <span className="absolute top-5 left-0 bg-ink">{s.icon}</span>
            <Card hi={phase.status === "now"} className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-semibold">{phase.title}</h3>
                <Badge tone={s.tone}>{s.label}</Badge>
              </div>
              <p className="mt-1 text-sm text-mute">{phase.summary}</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {phase.items.map((i) => (
                  <li key={i} className="flex gap-2 text-sm text-fg-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold/70" />
                    {i}
                  </li>
                ))}
              </ul>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

export default function Roadmap() {
  return (
    <Page className="max-w-4xl">
      <PageTitle title="Roadmap" sub="What's built, what's next and what comes after." />
      <RoadmapList />
    </Page>
  );
}
