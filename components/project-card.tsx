import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  href: string;
  title: string;
  summary: string;
  tags: string[];
  repoUrl?: string | undefined;
  demoUrl?: string | undefined;
}

export function ProjectCard({
  href,
  title,
  summary,
  tags,
  repoUrl,
  demoUrl,
}: Readonly<ProjectCardProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link href={href}>{title}</Link>
        </CardTitle>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>
      <CardContent>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
      {(repoUrl ?? demoUrl) ? (
        <CardFooter className="gap-2">
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Repo
            </a>
          ) : null}
          {demoUrl ? (
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Demo
            </a>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
