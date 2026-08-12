import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
}: ProjectCardProps) {
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
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a href={repoUrl} target="_blank" rel="noopener noreferrer" />
              }
            >
              Repo
            </Button>
          ) : null}
          {demoUrl ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a href={demoUrl} target="_blank" rel="noopener noreferrer" />
              }
            >
              Demo
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
