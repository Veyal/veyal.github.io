"use client";

import { useRef } from "react";
import Image from "next/image";
import { FileImage, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { formatCurrency } from "./format";
import type { Person, ReceiptData } from "./types";

type SetupStepProps = {
  selectedFile: File | null;
  previewUrl: string | null;
  hasCroppedImage: boolean;
  isAnalyzing: boolean;
  onFileDrop: (files: FileList | null) => void;
  onResetUpload: () => void;
  onOpenCrop: () => void;
  onResetCrop: () => void;
  onAnalyze: () => void;

  currentReceipt: ReceiptData | null;
  ocrMeta: { method: string } | null;
  onUpdateReceipt: (receipt: ReceiptData) => void;

  people: Person[];
  personInput: string;
  onPersonInputChange: (value: string) => void;
  onAddPerson: () => void;
  onRemovePerson: (name: string) => void;

  onContinue: () => void;
};

export function SetupStep({
  selectedFile,
  previewUrl,
  hasCroppedImage,
  isAnalyzing,
  onFileDrop,
  onResetUpload,
  onOpenCrop,
  onResetCrop,
  onAnalyze,
  currentReceipt,
  ocrMeta,
  onUpdateReceipt,
  people,
  personInput,
  onPersonInputChange,
  onAddPerson,
  onRemovePerson,
  onContinue,
}: SetupStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="sb-card space-y-6 p-6">
      <header className="space-y-1">
        <h2 className="sb-heading text-lg">Upload &amp; set up</h2>
        <p className="text-sm text-[var(--sb-slate)]">
          Add a receipt, confirm the totals, then list who&apos;s splitting.
        </p>
      </header>

      <div
        className="sb-dropzone cursor-pointer"
        data-has-file={Boolean(selectedFile)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          onFileDrop(e.dataTransfer.files);
        }}
        onClick={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("button")) return;
          fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            onFileDrop(event.target.files);
            if (event.target) event.target.value = "";
          }}
        />
        {previewUrl ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-xl">
              <Image
                src={previewUrl}
                alt="Receipt preview"
                fill
                sizes="(max-width: 768px) 90vw, 480px"
                className="rounded-lg border border-[var(--sb-line)] bg-white object-contain"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  onResetUpload();
                }}
              >
                Remove
              </Button>
              <Button
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenCrop();
                }}
              >
                Crop receipt
              </Button>
              {hasCroppedImage && (
                <Button
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResetCrop();
                  }}
                >
                  Reset crop
                </Button>
              )}
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  onAnalyze();
                }}
                disabled={!selectedFile || isAnalyzing}
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing
                  </span>
                ) : (
                  "Analyze receipt"
                )}
              </Button>
            </div>
            <p className="w-full text-center text-xs text-[var(--sb-slate)]">
              {hasCroppedImage
                ? "Using the cropped image. Re-open Crop to adjust."
                : "Tip: crop to the receipt text to improve accuracy."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <FileImage className="mx-auto h-12 w-12 text-[var(--sb-slate)] opacity-60" />
            <p className="sb-heading text-lg">Drop your receipt here</p>
            <p className="text-sm text-[var(--sb-slate)]">
              Supports JPG, PNG, and HEIC. Nothing is uploaded to a server.
            </p>
            <Button
              className="mt-2"
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse files
            </Button>
          </div>
        )}
      </div>

      {currentReceipt && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-[var(--sb-line)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Merchant
              </p>
              <p className="sb-heading text-xl">
                {currentReceipt.restaurant || "Restaurant name not detected"}
              </p>
              <p className="text-sm text-[var(--sb-slate)]">
                {currentReceipt.address || "Address not detected"}
              </p>
              <p className="text-sm text-[var(--sb-slate)]">
                {currentReceipt.date || "Date not detected"}
              </p>
              {ocrMeta && (
                <p className="text-xs text-[var(--sb-slate)]">
                  Parsed via {ocrMeta.method}
                </p>
              )}

              <div className="space-y-3 border-t border-[var(--sb-line)] pt-4">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor="currency"
                      className="text-xs font-semibold uppercase tracking-wider text-[var(--sb-slate)]"
                    >
                      Currency
                    </Label>
                    <Input
                      id="currency"
                      value={currentReceipt.currency}
                      onChange={(e) =>
                        onUpdateReceipt({
                          ...currentReceipt,
                          currency: e.target.value.toUpperCase(),
                        })
                      }
                      className="font-mono"
                      placeholder="IDR, USD..."
                    />
                  </div>
                  {currentReceipt.currency !== "IDR" && (
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="exchangeRate"
                        className="text-xs font-semibold uppercase tracking-wider text-[var(--sb-slate)]"
                      >
                        Rate to IDR
                      </Label>
                      <Input
                        id="exchangeRate"
                        type="number"
                        value={currentReceipt.exchangeRate}
                        onChange={(e) =>
                          onUpdateReceipt({
                            ...currentReceipt,
                            exchangeRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="font-mono"
                        placeholder="15000"
                      />
                    </div>
                  )}
                </div>
                {currentReceipt.currency !== "IDR" && (
                  <p className="text-xs text-[var(--sb-slate)]">
                    1 {currentReceipt.currency} ={" "}
                    <span className="sb-amount">
                      {formatCurrency(currentReceipt.exchangeRate)}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-[var(--sb-line)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Bill summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--sb-slate)]">Items total</span>
                  <span className="sb-amount">
                    {formatCurrency(currentReceipt.subtotal, currentReceipt.currency)}
                  </span>
                </div>
                {currentReceipt.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--sb-slate)]">Service charge</span>
                    <span className="sb-amount">
                      {formatCurrency(
                        currentReceipt.serviceCharge,
                        currentReceipt.currency
                      )}
                    </span>
                  </div>
                )}
                {currentReceipt.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--sb-slate)]">Tax</span>
                    <span className="sb-amount">
                      {formatCurrency(currentReceipt.tax, currentReceipt.currency)}
                    </span>
                  </div>
                )}
                {currentReceipt.extraCharges.map((charge) => (
                  <div className="flex justify-between" key={charge.name}>
                    <span className="text-[var(--sb-slate)]">{charge.name}</span>
                    <span className="sb-amount">
                      {formatCurrency(charge.amount, currentReceipt.currency)}
                    </span>
                  </div>
                ))}
                {currentReceipt.discount !== 0 && (
                  <div className="flex justify-between font-medium text-[var(--sb-accent)]">
                    <span>Discount</span>
                    <span className="sb-amount">
                      {formatCurrency(currentReceipt.discount, currentReceipt.currency)}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-[var(--sb-line)] pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span className="sb-amount text-[var(--sb-accent)]">
                    {formatCurrency(currentReceipt.total, currentReceipt.currency)}
                  </span>
                </div>
                {!currentReceipt.isValid && (
                  <p className="rounded-md border border-[var(--sb-accent)] bg-[rgba(196,92,38,0.06)] px-3 py-2 text-xs text-[var(--sb-ink)]">
                    Totals don&apos;t reconcile exactly. Double-check the numbers.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--sb-line)] p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
              Line items
            </p>
            <div className="space-y-2">
              {currentReceipt.items.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between rounded-md border border-[var(--sb-line)] bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--sb-ink)]">{item.name}</p>
                    {item.translatedName && (
                      <p className="mt-0.5 text-sm text-[var(--sb-slate)]">
                        {item.translatedName}
                      </p>
                    )}
                    <p className="text-xs text-[var(--sb-slate)]">
                      {item.total === 0 ? "Free / note" : `item #${index + 1}`}
                    </p>
                  </div>
                  <p className="sb-amount font-medium text-[var(--sb-ink)]">
                    {formatCurrency(item.total, currentReceipt.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--sb-line)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
              Add people
            </p>
            <p className="mt-1 text-sm text-[var(--sb-slate)]">
              Everyone listed receives an itemized share.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-4 md:col-span-2">
                <Label htmlFor="personName" className="text-sm font-medium">
                  Person name
                </Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="personName"
                    placeholder="e.g. Alice, Bob..."
                    value={personInput}
                    onChange={(e) => onPersonInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onAddPerson();
                      }
                    }}
                  />
                  <Button onClick={onAddPerson} className="whitespace-nowrap">
                    Add person
                  </Button>
                </div>
                <p className="text-xs text-[var(--sb-slate)]">
                  Press Enter to add quickly.
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--sb-line)] p-4 text-sm text-[var(--sb-slate)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                  Headcount
                </p>
                <p>
                  <strong className="sb-amount text-[var(--sb-ink)]">
                    {people.length}
                  </strong>{" "}
                  {people.length === 1 ? "person" : "people"} added.
                </p>
                <p>Each receives a fair-share summary.</p>
              </div>
            </div>

            {people.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {people.map((person) => (
                  <span
                    key={person.name}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--sb-line)] px-4 py-1.5 text-sm font-medium text-[var(--sb-ink)]"
                    style={{ backgroundColor: `${person.color}1a` }}
                  >
                    {person.name}
                    <button
                      className="text-xs opacity-70 hover:opacity-100"
                      onClick={() => onRemovePerson(person.name)}
                      aria-label={`Remove ${person.name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--sb-slate)]">No one added yet.</p>
            )}
          </div>

          <div className="sb-totals-bar -mx-6 flex justify-end border-t border-[var(--sb-line)] bg-[var(--sb-card)] px-6 py-3">
            <Button onClick={onContinue} disabled={people.length === 0}>
              Continue to Assign
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
