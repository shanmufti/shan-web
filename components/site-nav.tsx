"use client";

import { Lock, LockOpen, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { NavSection } from "@/lib/site-access";
import { cn } from "@/lib/utils";

import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { WaterLight } from "./water-light";

export type NavLink = NavSection;

interface Account {
  href: string;
  label: string;
  title: string;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const noopSubscribe = () => () => undefined;
function useIsMac() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => true,
  );
}

/** Passcode sections get a lock; open once the visitor has unlocked them. */
function GateIcon({ link }: Readonly<{ link: NavLink }>) {
  if (!link.gated) return null;
  const Icon = link.locked ? Lock : LockOpen;
  return (
    <>
      <Icon className="size-3.5 opacity-70" aria-hidden="true" />
      <span className="sr-only">
        {link.locked ? "(passcode required)" : "(unlocked)"}
      </span>
    </>
  );
}

/**
 * Transparent over the water light at the top of the page, solid once the
 * page scrolls. Slides away while scrolling down and returns on scroll up
 * (never while it holds focus or a menu is open).
 */
function useHeaderScroll(
  headerRef: React.RefObject<HTMLElement | null>,
  pinned: boolean,
) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      setScrolled(y > 8);
      const holdsFocus = headerRef.current?.contains(document.activeElement);
      if (y < 96 || holdsFocus) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      if (Math.abs(delta) > 6 || y < 96) lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headerRef]);

  const isHidden = hidden && !pinned;
  // Lets other sticky bars sit under the header: --header-offset in CSS.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-header-hidden", isHidden);
  }, [isHidden]);

  return { scrolled, hidden: isHidden };
}

export function SiteNav({
  account,
  links,
}: Readonly<{ account: Account | null; links: NavLink[] }>) {
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isMac = useIsMac();
  const { scrolled, hidden } = useHeaderScroll(
    headerRef,
    menuOpen || paletteOpen,
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);
  const closePalette = useCallback(() => {
    setPaletteOpen(false);
  }, []);
  const openPalette = useCallback(() => {
    setMenuOpen(false);
    setPaletteOpen(true);
  }, []);

  // Cmd/Ctrl+K anywhere; "/" when not typing in a field.
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setMenuOpen(false);
        setPaletteOpen((value) => !value);
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable === true ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [openPalette]);

  // Mobile menu as a modal dialog (focus trap, Escape, inert page).
  useEffect(() => {
    const dialog = menuRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  // Clear the Payload session cookie, then re-render as a public visitor.
  async function logOut() {
    setLoggingOut(true);
    try {
      await fetch("/api/users/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setLoggingOut(false);
      closeMenu();
      router.refresh();
    }
  }

  const accountLinks = account ? (
    <>
      <Link
        href={account.href}
        title={account.title}
        className="text-foreground text-sm font-medium"
      >
        {account.label}
      </Link>
      <button
        type="button"
        onClick={() => void logOut()}
        disabled={loggingOut}
        className="text-muted-foreground hover:text-foreground text-sm disabled:opacity-50"
      >
        Log out
      </button>
    </>
  ) : (
    <Link
      href="/admin/login"
      className="text-muted-foreground hover:text-foreground text-sm"
    >
      Log in
    </Link>
  );

  return (
    <>
      <header
        ref={headerRef}
        data-scrolled={scrolled ? "" : undefined}
        data-hidden={hidden ? "" : undefined}
        className={cn(
          "sticky top-0 z-40 h-(--header-height) border-b border-transparent transition-[transform,background-color,border-color,box-shadow] duration-300 ease-(--ease-out-soft)",
          scrolled &&
            "bg-background/85 border-border shadow-xs backdrop-blur-md backdrop-saturate-150",
          hidden && "-translate-y-full",
        )}
      >
        <nav
          aria-label="Main"
          className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-6 lg:px-10"
        >
          <Link
            href="/"
            aria-label="smufti, home"
            className="-mx-1 rounded-md px-1 text-lg font-semibold tracking-[-0.02em]"
          >
            smufti
          </Link>

          <div className="flex items-center gap-2 md:gap-6">
            <ul className="hidden items-center gap-6 md:flex">
              {links.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-sm text-sm underline-offset-[6px] transition-colors",
                        active
                          ? "text-foreground underline decoration-1"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {link.label}
                      <GateIcon link={link} />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={openPalette}
              aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
              className="border-input bg-card/70 text-muted-foreground hover:text-foreground hover:border-ring/40 hidden h-9 w-48 items-center gap-2 rounded-lg border px-3 text-sm transition-colors md:inline-flex"
            >
              <Search className="size-3.5" aria-hidden="true" />
              Search
              <kbd className="ml-auto font-mono text-[0.7rem]">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>

            <button
              type="button"
              onClick={openPalette}
              aria-label="Search"
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-10 items-center justify-center rounded-lg md:hidden"
            >
              <Search className="size-5" aria-hidden="true" />
            </button>

            <ThemeToggle />

            <div className="hidden items-center gap-4 md:flex">
              {accountLinks}
            </div>

            <button
              type="button"
              className="hover:bg-muted -mr-2 inline-flex size-10 items-center justify-center rounded-lg md:hidden"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => {
                setMenuOpen(true);
              }}
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      <dialog
        ref={menuRef}
        id="mobile-menu"
        aria-label="Menu"
        onClose={closeMenu}
        className="bg-background text-foreground open:animate-fade-in m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto p-0 md:hidden"
      >
        <div className="relative isolate flex min-h-full flex-col">
          <WaterLight />
          <div className="flex h-(--header-height) items-center justify-between px-6">
            <Link
              href="/"
              onClick={closeMenu}
              className="text-lg font-semibold tracking-[-0.02em]"
            >
              smufti
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              className="hover:bg-muted -mr-2 inline-flex size-10 items-center justify-center rounded-lg"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 px-6 pt-10">
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href="/"
                  onClick={closeMenu}
                  aria-current={pathname === "/" ? "page" : undefined}
                  className={cn(
                    "font-heading inline-flex items-center gap-3 py-2 text-5xl",
                    pathname === "/" ? "text-primary" : "text-foreground",
                  )}
                >
                  Home
                </Link>
              </li>
              {links.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={closeMenu}
                      className={cn(
                        "font-heading inline-flex items-center gap-3 py-2 text-5xl [&_svg]:size-6",
                        active ? "text-primary" : "text-foreground",
                      )}
                    >
                      {link.label}
                      <GateIcon link={link} />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={openPalette}
              className="border-input bg-card/70 text-muted-foreground mt-10 flex h-12 w-full items-center gap-3 rounded-xl border px-4 text-base"
            >
              <Search className="size-4" aria-hidden="true" />
              Search
            </button>
          </nav>

          <div className="border-border flex items-center gap-6 border-t px-6 py-5">
            {accountLinks}
          </div>
        </div>
      </dialog>

      {paletteOpen ? <CommandPalette onClose={closePalette} /> : null}
    </>
  );
}
