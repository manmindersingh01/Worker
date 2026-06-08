import { cn } from "~/lib/utils";

/**
 * PlasmaOrb — a glowing AI "energy sphere" hero visual, built entirely from
 * layered CSS gradients + an SVG filament web. No image asset required.
 */
export default function PlasmaOrb({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-square select-none", className)}>
      {/* Ambient bloom behind the sphere */}
      <div className="animate-orb-pulse absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,hsl(var(--grad-from)/0.65),hsl(var(--grad-to)/0.25)_45%,transparent_70%)] blur-3xl" />

      {/* The sphere */}
      <div className="animate-orb-pulse absolute inset-[10%] overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_58%,hsl(258_55%_10%),hsl(258_70%_3%)_72%)] shadow-[inset_0_0_80px_-10px_hsl(var(--grad-from)/0.5),0_0_70px_-10px_hsl(var(--grad-from)/0.5)]">
        {/* Rotating plasma — two counter-spinning conic sweeps */}
        <div className="animate-orb-spin absolute -inset-1/3 bg-[conic-gradient(from_0deg,transparent,hsl(var(--grad-from)/0.6),transparent_22%,hsl(var(--grad-to)/0.6),transparent_52%,hsl(var(--grad-via)/0.55),transparent_82%)] opacity-80 blur-[8px]" />
        <div className="animate-orb-spin-rev absolute -inset-1/3 bg-[conic-gradient(from_140deg,transparent,hsl(var(--grad-to)/0.45),transparent_38%,hsl(var(--grad-from)/0.5),transparent_72%)] opacity-70 blur-[14px]" />

        {/* Electric filament web */}
        <svg
          viewBox="0 0 200 200"
          className="animate-orb-spin-rev absolute inset-0 h-full w-full opacity-70"
          aria-hidden
        >
          <defs>
            <filter id="orb-electric">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.02"
                numOctaves="2"
                seed="7"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="14"
              />
            </filter>
            <radialGradient id="orb-stroke" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(190 95% 70%)" />
              <stop offset="60%" stopColor="hsl(268 90% 70%)" />
              <stop offset="100%" stopColor="hsl(300 85% 66%)" />
            </radialGradient>
          </defs>
          <g
            filter="url(#orb-electric)"
            fill="none"
            stroke="url(#orb-stroke)"
            strokeWidth="0.6"
          >
            <circle cx="100" cy="100" r="78" opacity="0.5" />
            <ellipse cx="100" cy="100" rx="78" ry="40" opacity="0.6" />
            <ellipse cx="100" cy="100" rx="40" ry="78" opacity="0.6" />
            <ellipse cx="100" cy="100" rx="64" ry="64" opacity="0.45" />
            <ellipse
              cx="100"
              cy="100"
              rx="78"
              ry="40"
              opacity="0.5"
              transform="rotate(45 100 100)"
            />
            <ellipse
              cx="100"
              cy="100"
              rx="78"
              ry="40"
              opacity="0.5"
              transform="rotate(-45 100 100)"
            />
          </g>
        </svg>

        {/* Sparkle nodes */}
        <div className="absolute inset-0 bg-[radial-gradient(1.5px_1.5px_at_32%_38%,#fff,transparent),radial-gradient(1.5px_1.5px_at_68%_62%,hsl(190_95%_75%),transparent),radial-gradient(1.5px_1.5px_at_58%_30%,hsl(300_90%_78%),transparent),radial-gradient(2px_2px_at_40%_70%,#fff,transparent),radial-gradient(1.5px_1.5px_at_75%_45%,hsl(268_92%_80%),transparent)] opacity-80" />

        {/* Inner rim light */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_50px_10px_hsl(var(--grad-from)/0.3)]" />

        {/* Bright nucleus */}
        <div className="absolute left-1/2 top-[52%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-90 blur-md" />
        <div className="animate-orb-pulse absolute left-1/2 top-[52%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(190_95%_80%/0.7),transparent_65%)] blur-lg" />
      </div>

      {/* Orbiting hairline ring */}
      <div className="animate-orb-spin absolute inset-[4%] rounded-full border border-[hsl(var(--grad-from)/0.22)]" />
      <div className="animate-orb-spin-rev absolute inset-[1%] rounded-full border border-[hsl(var(--grad-to)/0.14)]" />
    </div>
  );
}
