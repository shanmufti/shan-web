import { SectionSubnav } from "@/components/section-subnav";

const VAULT_LINKS = [
  { href: "/vault", label: "Overview" },
  { href: "/vault/files", label: "Files" },
  { href: "/vault/drops", label: "File drops" },
  { href: "/vault/snippets", label: "Snippets" },
];

export function VaultSubnav({ current }: Readonly<{ current?: string }>) {
  return <SectionSubnav links={VAULT_LINKS} current={current} />;
}

/** Link into the Payload admin, styled like the other quiet text links. */
export const adminLinkClass =
  "text-muted-foreground hover:text-foreground underline-offset-4 hover:underline";
