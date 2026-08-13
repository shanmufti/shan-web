import Link from "next/link";

/** Header + nav escape hatch back to the public site from /admin. */
export function ViewSiteLink() {
  return (
    <Link
      href="/"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        fontSize: "0.875rem",
        fontWeight: 500,
        textDecoration: "none",
        color: "var(--theme-elevation-800)",
      }}
    >
      ← View site
    </Link>
  );
}

export default ViewSiteLink;
