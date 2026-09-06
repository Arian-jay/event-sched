"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/supabase";

const baseLinks = [
  { href: "/dashboard", label: "Calendar" },
  { href: "/dashboard/connections", label: "Connections" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNavbar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile panel automatically whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const links = profile.role === "admin" ? [...baseLinks, { href: "/admin", label: "Admin" }] : baseLinks;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[hsl(229_38%_13%)] text-white">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-display text-xl font-semibold tracking-tight">
            PlanSpot
          </Link>

          {/* Desktop nav */}
          <nav className="hidden gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                  pathname === link.href && "bg-white/10 text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <NotificationBell />
          <span className="hidden text-sm text-white/70 sm:inline">@{profile.username}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="hidden text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            Sign out
          </Button>

          {/* Mobile hamburger toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            className="text-white/80 hover:bg-white/10 hover:text-white sm:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 pt-3 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                pathname === link.href && "bg-white/10 text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm text-white/70">@{profile.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}