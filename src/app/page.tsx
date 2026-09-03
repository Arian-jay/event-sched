import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const previewDays = Array.from({ length: 35 }, (_, i) => i);
  const markedDays = new Set([4, 11, 15, 22, 27]);

  return (
    <main className="min-h-screen bg-background">
      <header className="container flex h-20 items-center justify-between">
        <span className="font-display text-xl font-semibold">PlanSpot</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="container grid gap-12 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] sm:text-5xl">
            Keep the days that matter, in view for both of you.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Connect with the people you plan around. Mark a day, share it, and it shows up on
            their calendar too — no more crossed wires.
          </p>
          <div className="mt-8 flex gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Create your calendar</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="mb-4 font-display text-lg font-medium">September</p>
          <div className="grid grid-cols-7 gap-2">
            {previewDays.map((d) => (
              <div
                key={d}
                className={`flex h-9 items-center justify-center rounded-md text-sm ${
                  markedDays.has(d) ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {((d % 30) + 1)}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
