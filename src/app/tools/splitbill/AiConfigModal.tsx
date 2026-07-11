"use client";

import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OpenAiConfig } from "./types";

type Props = {
  open: boolean;
  initialConfig: OpenAiConfig;
  onClose: () => void;
  onSave: (config: OpenAiConfig) => void;
};

export function AiConfigModal({ open, initialConfig, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<OpenAiConfig>(initialConfig);

  useEffect(() => {
    if (open) setDraft(initialConfig);
  }, [open, initialConfig]);

  if (!open) return null;

  return (
    <div className="sb-modal-backdrop">
      <div className="sb-modal" role="dialog" aria-labelledby="sb-ai-config-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="sb-ai-config-title" className="sb-heading flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-[var(--sb-accent)]" />
            AI settings
          </h3>
          <button type="button" className="sb-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--sb-slate)]">
          Keys stay in your browser. Requests go to the base URL you enter.
          Include <code className="font-mono text-xs">/v1</code> when your provider needs it
          (for example <code className="font-mono text-xs">https://api.openai.com/v1</code>).
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="sb-base-url">Base URL</Label>
            <Input
              id="sb-base-url"
              placeholder="https://api.openai.com/v1"
              value={draft.baseUrl}
              onChange={(e) => setDraft((p) => ({ ...p, baseUrl: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="sb-api-key">API key</Label>
            <Input
              id="sb-api-key"
              type="password"
              placeholder="sk-..."
              value={draft.apiKey}
              onChange={(e) => setDraft((p) => ({ ...p, apiKey: e.target.value }))}
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="sb-model">Model</Label>
            <Input
              id="sb-model"
              placeholder="gpt-4o"
              value={draft.model}
              onChange={(e) => setDraft((p) => ({ ...p, model: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
