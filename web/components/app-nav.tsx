"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/lineage", label: "Data Lineage" },
  { href: "/mapping", label: "Mapping Studio" },
  { href: "/quality", label: "Data Quality" },
  { href: "/alerts", label: "Alerts" },
  { href: "/cases/135", label: "Case Digital Twin" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-6 py-4">
        <div className="text-sm font-semibold">EPA Harmonization Cockpit</div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 transition ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
