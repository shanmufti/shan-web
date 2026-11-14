import {
  Anchor,
  Bike,
  BookOpen,
  Camera,
  ChefHat,
  Code,
  Compass,
  Dumbbell,
  Fish,
  Footprints,
  Gamepad2,
  Guitar,
  Mountain,
  MountainSnow,
  Music,
  Palette,
  PersonStanding,
  Sailboat,
  Snowflake,
  Sparkles,
  Sprout,
  Tent,
  Volleyball,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";

import type { HobbyIconName } from "@/lib/hobby-options";

const ICONS: Record<HobbyIconName, LucideIcon> = {
  mountain: Mountain,
  "mountain-snow": MountainSnow,
  waves: Waves,
  anchor: Anchor,
  fish: Fish,
  sailboat: Sailboat,
  wind: Wind,
  snowflake: Snowflake,
  bike: Bike,
  footprints: Footprints,
  "person-standing": PersonStanding,
  dumbbell: Dumbbell,
  volleyball: Volleyball,
  tent: Tent,
  compass: Compass,
  camera: Camera,
  music: Music,
  guitar: Guitar,
  palette: Palette,
  "chef-hat": ChefHat,
  "book-open": BookOpen,
  code: Code,
  "gamepad-2": Gamepad2,
  sprout: Sprout,
  sparkles: Sparkles,
};

export function HobbyIcon({
  name,
  className,
}: Readonly<{ name: string; className?: string }>) {
  const Icon = (ICONS as Partial<Record<string, LucideIcon>>)[name] ?? Sparkles;
  return <Icon aria-hidden="true" className={className} />;
}
