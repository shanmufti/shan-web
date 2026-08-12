import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PostCardProps {
  href: string;
  title: string;
  summary: string;
  dateLabel: string;
  meta?: string | undefined;
  tags?: string[] | undefined;
}

export function PostCard({
  href,
  title,
  summary,
  dateLabel,
  meta,
  tags,
}: PostCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {dateLabel}
            {meta ? ` · ${meta}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{summary}</p>
          {tags && tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
