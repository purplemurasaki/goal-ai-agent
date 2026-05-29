export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-foreground/70">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

