"use client";

import { cn } from "@/lib/utils";
import type { Person } from "./types";

type PersonChipProps = {
  person: Person;
  assigned: boolean;
  onToggle: () => void;
};

export function PersonChip({ person, assigned, onToggle }: PersonChipProps) {
  return (
    <button
      type="button"
      className={cn("sb-chip")}
      style={{ backgroundColor: assigned ? person.color : undefined }}
      aria-pressed={assigned}
      aria-label={`${assigned ? "Remove" : "Add"} ${person.name}`}
      title={person.name}
      onClick={onToggle}
    >
      {person.name[0]?.toUpperCase()}
    </button>
  );
}
