import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
  /** Show wordmark next to the mark */
  withWordmark?: boolean;
  size?: number;
};

export function BrandMark({
  className,
  withWordmark = true,
  size = 36,
}: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/logo.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[22%] shadow-[0_1px_0_rgba(0,0,0,0.08)]"
        decoding="async"
      />
      {withWordmark ? (
        <span className="font-display text-[26px] font-semibold tracking-tight text-ink">
          Jacked
        </span>
      ) : (
        <span className="sr-only">Jacked</span>
      )}
    </span>
  );
}
