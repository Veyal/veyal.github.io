import { Braces, Dices, Lock, Receipt, ScanSearch, Wrench, type LucideIcon } from "lucide-react";

/** Maps the `icon` key in src/app/env/tools.json to a lucide icon. */
const ICONS: Record<string, LucideIcon> = { Braces, Dices, Lock, Receipt, ScanSearch };

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon className={className} aria-hidden="true" />;
}
