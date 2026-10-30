"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/lineage", label: "Data Lineage" },
  { href: "/raw_files", label: "Raw Files" },
  { href: "/mapping", label: "Mapping Studio" },
  { href: "/quality", label: "Data Quality" },
  { href: "/alerts", label: "Alerts" },
  { href: "/cases/135", label: "Case Digital Twin" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <Navbar
      maxWidth="xl"
      isBordered
      className="border-b border-divider bg-content1/70 backdrop-blur-md"
    >
      <NavbarBrand>
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-foreground-500">epa.cc • Data Harmonization</div>
          <div className="text-sm font-semibold">Smart Mapping Control Center</div>
        </div>
      </NavbarBrand>

      <NavbarContent justify="end" className="flex-wrap gap-1.5">
        {links.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavbarItem key={item.href}>
              <Button
                as={Link}
                href={item.href}
                radius="full"
                size="sm"
                variant={active ? "solid" : "bordered"}
                color={active ? "primary" : "default"}
                className="font-medium"
              >
                {item.label}
              </Button>
            </NavbarItem>
          );
        })}
      </NavbarContent>
    </Navbar>
  );
}
