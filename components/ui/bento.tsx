import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Bento grid: 1 column on phones, 2 on tablets, 4 from `lg`. Rows are at
 * least 10.5rem and grow with content. Renders a list; put BentoTiles in it.
 */
function BentoGrid({
  className,
  columns = 4,
  ...props
}: ComponentProps<"ul"> & { columns?: 3 | 4 }) {
  return (
    <ul
      data-slot="bento-grid"
      className={cn(
        "grid grid-flow-row-dense auto-rows-[minmax(10.5rem,auto)] grid-cols-1 gap-4 sm:grid-cols-2",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
      {...props}
    />
  );
}

const bentoTileVariants = cva(
  "group/tile relative isolate flex min-w-0 flex-col overflow-hidden rounded-tile p-6 has-[[data-slot=bento-link]:focus-visible]:outline-2 has-[[data-slot=bento-link]:focus-visible]:outline-offset-2 has-[[data-slot=bento-link]:focus-visible]:outline-ring",
  {
    variants: {
      tone: {
        surface: "bg-card text-card-foreground border-border border shadow-xs",
        water: "bg-tint-water text-foreground border-border border",
        kelp: "bg-tint-kelp text-foreground border-border border",
        sand: "bg-tint-sand text-foreground border-border border",
        coral: "bg-coral text-coral-foreground",
        ink: "bg-foreground text-background",
        dashed:
          "text-muted-foreground border-border border border-dashed bg-transparent",
      },
      cols: {
        1: "",
        2: "sm:col-span-2",
        3: "sm:col-span-2 lg:col-span-3",
        4: "sm:col-span-2 lg:col-span-4",
      },
      rows: {
        1: "",
        2: "sm:row-span-2",
      },
      layout: {
        stack: "justify-between gap-4",
        flow: "gap-4",
      },
    },
    defaultVariants: { tone: "surface", cols: 1, rows: 1, layout: "stack" },
  },
);

/** Secondary text colour that keeps AA contrast on every tone. */
const subtleText: Record<
  NonNullable<VariantProps<typeof bentoTileVariants>["tone"]>,
  string
> = {
  surface: "text-muted-foreground",
  water: "text-muted-foreground",
  kelp: "text-muted-foreground",
  sand: "text-muted-foreground",
  coral: "text-coral-foreground/85",
  ink: "text-background/75",
  dashed: "text-muted-foreground",
};

type BentoTileProps = Omit<ComponentProps<"li">, "title"> &
  VariantProps<typeof bentoTileVariants> & {
    /** Small mono label at the top. */
    eyebrow?: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
    /**
     * Makes the whole tile clickable through a stretched link on the title
     * (other links inside the tile still work and sit above it).
     */
    href?: string;
    /** Opens in a new tab with rel="noopener noreferrer". */
    external?: boolean;
    /** Passcode-gated destination: shows a lock next to the title. */
    locked?: boolean;
    headingLevel?: 2 | 3 | 4;
    /** Background layer (e.g. an SVG or image), behind the content. */
    background?: ReactNode;
  };

const stretchedLink =
  "outline-none after:absolute after:inset-0 after:z-0 after:rounded-[inherit] after:content-['']";

function TileLink({
  href,
  external,
  children,
}: Readonly<{
  href: string;
  external?: boolean | undefined;
  children: ReactNode;
}>) {
  if (external) {
    return (
      <a
        data-slot="bento-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={stretchedLink}
      >
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link data-slot="bento-link" href={href} className={stretchedLink}>
      {children}
    </Link>
  );
}

function TileHeading({
  level,
  title,
  href,
  external,
  locked,
  subtle,
}: Readonly<{
  level: 2 | 3 | 4;
  title: ReactNode;
  href?: string | undefined;
  external?: boolean | undefined;
  locked?: boolean | undefined;
  subtle: string;
}>) {
  const Heading = `h${String(level)}` as "h2" | "h3" | "h4";
  return (
    <Heading className="flex items-start gap-2 text-lg leading-snug font-medium tracking-[-0.015em]">
      <span className="min-w-0">
        {href ? (
          <TileLink href={href} external={external}>
            {title}
          </TileLink>
        ) : (
          title
        )}
      </span>
      {locked ? (
        <>
          <Lock
            className={cn("mt-1.5 size-3.5 shrink-0", subtle)}
            aria-hidden="true"
          />
          <span className="sr-only">(passcode required)</span>
        </>
      ) : null}
      {href ? (
        <ArrowUpRight
          className={cn(
            "mt-1 ml-auto size-4 shrink-0 opacity-0 transition-[opacity,transform] duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5 group-hover/tile:opacity-100",
            subtle,
          )}
          aria-hidden="true"
        />
      ) : null}
    </Heading>
  );
}

function BentoTile({
  className,
  tone = "surface",
  cols,
  rows,
  layout,
  eyebrow,
  title,
  description,
  href,
  external,
  locked,
  headingLevel = 3,
  background,
  children,
  ...props
}: BentoTileProps) {
  const subtle = subtleText[tone ?? "surface"];

  return (
    <li
      data-slot="bento-tile"
      data-tone={tone}
      className={cn(
        bentoTileVariants({ tone, cols, rows, layout }),
        href && "lift cursor-pointer",
        className,
      )}
      {...props}
    >
      {background ? (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {background}
        </div>
      ) : null}
      {eyebrow ? (
        <p className={cn("eyebrow flex items-center gap-2", subtle)}>
          {eyebrow}
        </p>
      ) : null}
      {title || description ? (
        <div className="flex flex-col gap-1.5">
          {title ? (
            <TileHeading
              level={headingLevel}
              title={title}
              href={href}
              external={external}
              locked={locked}
              subtle={subtle}
            />
          ) : null}
          {description ? (
            <p className={cn("text-[0.95rem] leading-relaxed", subtle)}>
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children ? (
        // Clicks on plain content fall through to the stretched link; inner
        // links and buttons sit above it and stay clickable.
        <div className="pointer-events-none relative z-10 [&_a,&_button,&_input,&_select,&_summary]:pointer-events-auto">
          {children}
        </div>
      ) : null}
    </li>
  );
}

export { BentoGrid, BentoTile, bentoTileVariants };
