import Link from "next/link";

import { getCurrentUser } from "@/lib/content";

const links = [
  { href: "/blog", label: "Blog" },
  { href: "/diving", label: "Diving" },
  { href: "/travel", label: "Travel" },
  { href: "/tech", label: "Tech" },
];

function emailFromUser(user: unknown): string | null {
  if (!user || typeof user !== "object" || !("email" in user)) return null;
  if (typeof user.email !== "string") return null;
  return user.email;
}

export async function Nav() {
  const user = await getCurrentUser();
  const email = emailFromUser(user);

  return (
    <header className="border-border border-b">
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-heading shrink-0 text-sm font-semibold">
          Shan Mufti
        </Link>
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <ul className="text-muted-foreground flex gap-4 text-sm sm:gap-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {user ? (
            <Link
              href="/admin"
              className="text-foreground shrink-0 text-sm font-medium"
              title={email ?? "Open admin"}
            >
              {email ? email.split("@")[0] : "Admin"}
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="bg-foreground text-background shrink-0 rounded-md px-2.5 py-1 text-sm font-medium"
            >
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
