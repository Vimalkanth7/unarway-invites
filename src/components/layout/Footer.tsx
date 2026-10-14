import Link from "next/link";

const links = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refund policy" },
];

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-sm text-neutral-600 sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Unarway Invites</p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-neutral-950">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
