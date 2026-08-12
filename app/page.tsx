import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sections = [
  {
    href: "/blog",
    title: "Blog",
    description: "Adventures, notes, and things worth writing down.",
  },
  {
    href: "/diving",
    title: "Diving",
    description: "Dive logs from around the world.",
  },
  {
    href: "/travel",
    title: "Travel",
    description: "Trips, places, and itineraries.",
  },
  {
    href: "/tech",
    title: "Tech",
    description: "Projects and technical write-ups.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-2xl font-semibold">Shan Mufti</h1>
      <p className="text-muted-foreground mt-3 max-w-xl">
        Divemaster, traveler, and engineer. This is where I write about all
        three.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="block">
            <Card className="hover:bg-muted/50 h-full transition-colors">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
