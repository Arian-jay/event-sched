export default function Loading() {
  const cells = Array.from({ length: 7 });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background">
      <div className="grid grid-cols-7 gap-2">
        {cells.map((_, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-[3px] bg-accent animate-pulse-soft"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <p className="font-display text-lg text-muted-foreground">
        Loading your schedule&hellip;
      </p>
    </div>
  );
}