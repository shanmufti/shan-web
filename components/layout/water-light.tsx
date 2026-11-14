import { cn } from "@/lib/utils";

/**
 * Soft "open water" light: a blue-to-background gradient, a glow from the
 * top and two slow layers of caustics. CSS only (see .water-light in
 * globals.css): transform-only animation, static with reduced motion.
 *
 * Place it as the first child of a `relative isolate` container; it sits
 * behind the content (z-index -1). `height` sets how far down it reaches.
 */
export function WaterLight({
  height,
  className,
}: Readonly<{ height?: string; className?: string }>) {
  return (
    <div
      aria-hidden="true"
      className={cn("water-light", className)}
      style={
        height
          ? ({ "--water-light-height": height } as React.CSSProperties)
          : undefined
      }
    >
      <div className="water-light__caustics">
        <div className="water-light__layer" />
        <div className="water-light__layer" />
      </div>
    </div>
  );
}
