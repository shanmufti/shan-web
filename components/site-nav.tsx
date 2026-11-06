"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { ThemeToggle } from "./theme-toggle";

export interface NavLink {
  href: string;
  label: string;
}

interface Account {
  href: string;
  label: string;
  title: string;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav({
  account,
  links,
}: Readonly<{ account: Account | null; links: NavLink[] }>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="bg-background/80 border-border sticky top-0 z-40 border-b backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-6 lg:px-10"
      >
        <Link href="/" className="text-[0.95rem] font-medium tracking-tight">
          Shan Mufti
        </Link>

        <div className="flex items-center gap-3 md:gap-6">
          <ul className="hidden items-center gap-6 md:flex">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "text-sm underline-offset-[6px] transition-colors",
                      active
                        ? "text-foreground underline decoration-1"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <ThemeToggle />

          {account ? (
            <Link
              href={account.href}
              title={account.title}
              className="text-foreground hidden text-sm font-medium md:inline-block"
            >
              {account.label}
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="text-muted-foreground hover:text-foreground hidden text-sm md:inline-block"
            >
              Log in
            </Link>
          )}

          <button
            type="button"
            className="hover:bg-muted -mr-2 inline-flex size-9 items-center justify-center rounded-md md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => {
              setOpen((value) => !value);
            }}
          >
            {open ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {open ? (
        <div
          id="mobile-menu"
          className="border-border border-t px-6 pt-2 pb-6 md:hidden"
        >
          <ul className="flex flex-col">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={closeMenu}
                    className={cn(
                      "font-heading block py-2 text-3xl",
                      active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={account ? account.href : "/admin/login"}
            onClick={closeMenu}
            className="text-muted-foreground mt-4 inline-block text-sm"
          >
            {account ? account.label : "Log in"}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
