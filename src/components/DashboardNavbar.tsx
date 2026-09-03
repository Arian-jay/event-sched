"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/supabase";

const links = [
  { href: "/dashboard", label: "Calendar" },
  { href: "/dashboard/connections", label: "Connections" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNavbar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

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
            {profile.role === "admin" && (
              <Link
                href="/admin"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                  pathname.startsWith("/admin") && "bg-white/10 text-white"
                )}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NotificationBell />
          <span className="hidden text-sm text-white/70 sm:inline">@{profile.username}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-white/80 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
