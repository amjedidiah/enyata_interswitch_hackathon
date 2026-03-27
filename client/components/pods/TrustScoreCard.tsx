import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import Motion from "@/components/shared/Motion";

interface TrustScoreCardProps {
  position: number;
  name: string;
  email?: string;
  score?: number;
  reasoning?: string;
  movedByAI?: boolean;
  isNext?: boolean;
}

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreRing({ score }: Readonly<{ score: number }>) {
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);
  let color = "var(--color-brand-danger)";
  if (score >= 75) {
    color = "var(--color-brand-success)";
  } else if (score >= 50) {
    color = "var(--color-brand-warning)";
  }

  return (
    <svg width="44" height="44" className="-rotate-90" aria-hidden="true">
      {/* Track */}
      <circle
        cx={22}
        cy={22}
        r={RADIUS}
        fill="none"
        stroke="var(--color-brand-border)"
        strokeWidth={3}
      />
      {/* Animated progress */}
      <Motion
        as="circle"
        cx={22}
        cy={22}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        initial={{ strokeDashoffset: CIRCUMFERENCE }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

function TrustScoreCard({
  position,
  name,
  email,
  score,
  reasoning,
  movedByAI = false,
  isNext = false,
}: Readonly<TrustScoreCardProps>) {
  return (
    <div className="flex flex-col gap-2">
      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Position badge */}
        <span
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            isNext
              ? "bg-brand-accent text-brand-primary"
              : "bg-brand-muted/20 text-brand-muted",
          )}
        >
          {position}
        </span>

        {/* Score ring or fallback avatar */}
        {score === undefined ? (
          <span className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-semibold flex items-center justify-center text-xs shrink-0">
            {name.charAt(0).toUpperCase()}
          </span>
        ) : (
          <div className="relative w-11 h-11 shrink-0">
            <ScoreRing score={score} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-brand-text">
              {score}
            </span>
          </div>
        )}

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brand-text">{name}</p>
          {email && (
            <p className="text-xs text-brand-muted truncate">{email}</p>
          )}
        </div>

        {isNext && (
          <span className="text-xs font-semibold text-brand-accent bg-brand-accent/10 border border-brand-accent/20 px-2 py-0.5 rounded-full shrink-0">
            Next
          </span>
        )}
      </div>

      {/* No score yet */}
      {score === undefined && (
        <div className="ml-9 pl-3 border-l-2 border-brand-muted/20">
          <p className="text-xs text-brand-muted leading-relaxed">
            <span className="font-medium">No AI score yet</span> — score is
            automatically generated after the member&apos;s first contribution
            cycle.
          </p>
        </div>
      )}

      {/* AI reasoning callout */}
      {reasoning && (
        <div className="ml-9 pl-3 border-l-2 border-brand-accent/40 bg-brand-accent/5 rounded-r-lg py-1.5 pr-3">
          <p className="text-xs text-brand-muted leading-relaxed">
            <span className="font-semibold text-brand-accent">AI Note: </span>
            {reasoning}
          </p>
        </div>
      )}

      {/* Moved by AI banner */}
      {movedByAI && (
        <div className="ml-9 flex items-center gap-1.5 text-xs font-medium text-brand-warning bg-brand-warning/10 border border-brand-warning/30 rounded-lg px-3 py-1.5">
          <AlertTriangle size={12} className="shrink-0" />
          Moved to end of queue by AI Trust Agent
        </div>
      )}
    </div>
  );
}

export default TrustScoreCard;
