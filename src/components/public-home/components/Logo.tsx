import { useId } from "react";
import { LOGO, LOGO_CUT_PATH, LOGO_SKEW_DEG, LOGO_VIEWBOX } from "../logoGeometry";

export function LogoMark({ className = "", ink = "#0b0d12", accent = "#0a6cff" }: { className?: string; ink?: string; accent?: string }) {
  const id = "ncr" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const skew = `skewY(${-LOGO_SKEW_DEG})`;
  const { barW, barH, radius, topY, midY, midX, botY, dot } = LOGO;
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={id}>
          <path d={LOGO_CUT_PATH} clipRule="evenodd" />
        </clipPath>
      </defs>
      <g fill={ink}>
        <rect x={0} y={topY} width={barW} height={barH} rx={radius} transform={skew} />
        <g clipPath={`url(#${id})`}>
          <rect x={midX} y={midY} width={barW - midX} height={barH} rx={radius} transform={skew} />
        </g>
        <rect x={0} y={botY} width={barW} height={barH} rx={radius} transform={skew} />
      </g>
      <circle cx={dot.x} cy={dot.y} r={dot.r} fill={accent} />
    </svg>
  );
}

export function Logo({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="NCR Suite">
      <LogoMark ink={dark ? "#ffffff" : "#0b0d12"} className="h-8 w-auto" />
      <span className={`text-[1.15rem] leading-none tracking-tight ${dark ? "text-white" : "text-ink"}`}>
        <span className="font-extrabold">NCR</span> <span className="font-normal text-brand">Suite</span>
      </span>
    </span>
  );
}
