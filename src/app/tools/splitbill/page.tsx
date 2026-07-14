"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FileImage, Loader2, Settings, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { formatCurrency } from "./format";

import { AiConfigModal } from "./AiConfigModal";
import { CropModal } from "./CropModal";
import { AssignmentTotals } from "./AssignmentTotals";
import { ItemAssignRow } from "./ItemAssignRow";
import { processImageForOCR } from "./image";
import {
  DEFAULT_OPENAI_CONFIG,
  analyzeReceiptImage,
  buildShareableSearchParams,
  isConfigComplete,
  loadOpenAiConfig,
  parseConfigFromSearchParams,
  saveOpenAiConfig,
} from "./openai";
import type {
  ExtraCharge,
  OpenAiConfig,
  Person,
  PersonShare,
  ReceiptData,
  ReceiptItem,
  Step,
  TokenUsage,
} from "./types";

const STEP_ORDER: Step[] = ["upload", "review", "people", "assignment", "results"];

const STEP_META: Record<Step, { label: string; description: string }> = {
  upload: { label: "Upload", description: "Add a receipt photo" },
  review: { label: "Review", description: "Check the parsed items" },
  people: { label: "People", description: "List who is splitting" },
  assignment: { label: "Assign", description: "Match items to people" },
  results: { label: "Results", description: "Per-person totals" },
};

/** Free (0-priced) items do not need an assignee. */
const itemRequiresAssignment = (item: ReceiptItem) => item.total !== 0;

const isItemUnassigned = (item: ReceiptItem) =>
  !item.assignedTo || item.assignedTo.length === 0;

const COLOR_POOL = [
  "#c45c26",
  "#2f6f6a",
  "#6b4f8a",
  "#a23b3b",
  "#3b6ea2",
  "#7a6a2f",
  "#4b7a3b",
  "#8a4f6b",
  "#2f5f8a",
  "#8a6a2f",
];

const formatTokenCount = (value?: number) =>
  value != null ? value.toLocaleString() : "unknown";

const describeTokenUsage = (usage: TokenUsage) => {
  const parts: string[] = [];
  if (usage.totalTokens != null) {
    parts.push(`Total ${formatTokenCount(usage.totalTokens)} tokens`);
  }
  if (usage.promptTokens != null) {
    parts.push(`Prompt ${formatTokenCount(usage.promptTokens)}`);
  }
  if (usage.completionTokens != null) {
    parts.push(`Completion ${formatTokenCount(usage.completionTokens)}`);
  }
  return parts.join(" · ");
};

const getRandomColor = () =>
  COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];

const parseReceipt = (data: any): ReceiptData => {
  const safeNumber = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const rawItems = Array.isArray(data?.items) ? data.items : [];
  const items: ReceiptItem[] = rawItems
    .map((item: any) => {
      const price = safeNumber(item?.price);
      const name = (item?.name ?? "").trim();
      if (!name) return null;
      const translatedName = (item?.translatedName ?? "").trim();
      return {
        name,
        translatedName: translatedName || undefined,
        quantity: 1,
        price,
        total: price,
        assignedTo: [],
        percentages: {},
      };
    })
    .filter(Boolean) as ReceiptItem[];

  const extraCharges: ExtraCharge[] = (Array.isArray(data?.extraCharges)
    ? data.extraCharges
    : []
  )
    .map((charge: any) => ({
      name: (charge?.name ?? "Extra").trim() || "Extra",
      amount: safeNumber(charge?.amount),
    }))
    .filter((charge: ExtraCharge) => charge.amount !== 0);

  const subtotal =
    safeNumber(data?.subtotal) || items.reduce((s, i) => s + i.total, 0);
  const serviceCharge = safeNumber(data?.serviceCharge);
  const tax = safeNumber(data?.tax);
  const discount = safeNumber(data?.discount);
  const total = safeNumber(data?.total);
  const computedTotal =
    items.reduce((sum, item) => sum + item.total, 0) +
    serviceCharge +
    tax +
    extraCharges.reduce((sum, charge) => sum + charge.amount, 0) +
    discount;

  const currency = (data?.currency ?? "IDR").toUpperCase();
  const exchangeRate = 1;

  return {
    restaurant: (data?.restaurant ?? "").trim(),
    address: (data?.address ?? "").trim(),
    date: (data?.date ?? "").trim(),
    currency,
    exchangeRate,
    items,
    subtotal,
    serviceCharge,
    tax,
    discount,
    extraCharges,
    total: total || computedTotal,
    computedTotal,
    isValid: total ? Math.abs(total - computedTotal) < 1 : true,
    error: data?.error,
  };
};

type OcrMeta = { method: string };

type LoadingState = { text: string; subtext?: string } | null;

export default function SplitBillTool() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [personInput, setPersonInput] = useState("");
  const [results, setResults] = useState<PersonShare[] | null>(null);
  const [openAiConfig, setOpenAiConfig] = useState<OpenAiConfig>(
    DEFAULT_OPENAI_CONFIG
  );
  const [configLoadedFromUrl, setConfigLoadedFromUrl] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [hasCroppedImage, setHasCroppedImage] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ocrMeta, setOcrMeta] = useState<OcrMeta | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadOpenAiConfig();
    if (typeof window !== "undefined") {
      const fromUrl = parseConfigFromSearchParams(
        new URLSearchParams(window.location.search)
      );
      if (fromUrl) {
        const merged: OpenAiConfig = { ...loaded, ...fromUrl };
        saveOpenAiConfig(merged);
        setOpenAiConfig(merged);
        setConfigLoadedFromUrl(true);
        return;
      }
    }
    setOpenAiConfig(loaded);
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const assignmentSummary = useMemo(() => {
    if (!currentReceipt || people.length === 0) return [];
    return people.map((person) => {
      const personItems = currentReceipt.items.filter((item) =>
        item.assignedTo?.includes(person.name)
      );
      const subtotal = personItems.reduce((sum, item) => {
        const percentage =
          item.percentages?.[person.name] ||
          (item.assignedTo?.length ? 100 / new Set(item.assignedTo).size : 0);
        return sum + item.total * (percentage / 100);
      }, 0);
      return { ...person, subtotal, count: personItems.length };
    });
  }, [currentReceipt, people]);

  const hasUnassignedPricedItems = useMemo(() => {
    if (!currentReceipt) return false;
    return currentReceipt.items.some(
      (item) => itemRequiresAssignment(item) && isItemUnassigned(item)
    );
  }, [currentReceipt]);

  const handleFileDrop = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file (JPG, PNG, etc.)");
      return;
    }
    setSelectedFile(file);
    setOriginalFile(file);
    setHasCroppedImage(false);
    setShowCropModal(false);
  }, []);

  const handleResetUpload = useCallback(() => {
    setSelectedFile(null);
    setOriginalFile(null);
    setPreviewUrl(null);
    setCurrentReceipt(null);
    setHasCroppedImage(false);
    setShowCropModal(false);
    setResults(null);
    setOcrMeta(null);
    setPeople([]);
    setCurrentStep("upload");
    setTokenUsage(null);
  }, []);

  const handleResetCrop = () => {
    if (!originalFile) return;
    setSelectedFile(originalFile);
    setHasCroppedImage(false);
    setShowCropModal(false);
  };

  const handleSaveConfig = (config: OpenAiConfig) => {
    saveOpenAiConfig(config);
    setOpenAiConfig(config);
  };

  const handleCopyShareableConfig = async () => {
    if (!isConfigComplete(openAiConfig)) {
      setErrorMessage("Add your base URL, API key, and model first.");
      setShowConfigModal(true);
      return;
    }
    if (typeof window === "undefined") return;
    const params = buildShareableSearchParams(openAiConfig);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareNotice("Config link copied. It includes your API key.");
      setTimeout(() => setShareNotice(null), 4000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to copy the link."
      );
    }
  };

  const analyzeReceipt = async () => {
    if (isAnalyzing) return;

    if (!selectedFile) {
      setErrorMessage("Please upload a receipt first.");
      return;
    }
    if (!isConfigComplete(openAiConfig)) {
      setErrorMessage("Add your API details before analyzing.");
      setShowConfigModal(true);
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setTokenUsage(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      setLoadingState({
        text: "Reading receipt…",
        subtext: "Preparing the image",
      });

      const imageBase64 = await processImageForOCR(selectedFile);

      setLoadingState({
        text: "Reading receipt…",
        subtext: "Extracting items with the vision model",
      });

      const { parsedJson, usage } = await analyzeReceiptImage({
        config: openAiConfig,
        imageBase64,
        signal: controller.signal,
      });

      const receipt = parseReceipt(parsedJson);
      if (!receipt.items.length) {
        throw new Error(
          "No items detected. Try a clearer photo or crop to the receipt text."
        );
      }

      setCurrentReceipt(receipt);
      setTokenUsage(usage);
      setOcrMeta({ method: "OpenAI-compatible" });
      setCurrentStep("review");
    } catch (error) {
      let message = "Failed to analyze the receipt.";
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          message =
            "Request timed out after 60 seconds. Try cropping the image or a smaller photo.";
        } else if (error.message.toLowerCase().includes("fetch")) {
          message = "Network error. Check your connection and try again.";
        } else {
          message = error.message;
        }
      }
      setErrorMessage(message);
    } finally {
      clearTimeout(timeoutId);
      setLoadingState(null);
      setIsAnalyzing(false);
    }
  };

  const handleAddPerson = () => {
    if (!personInput.trim()) {
      setErrorMessage("Please enter a person's name.");
      return;
    }
    const exists = people.some(
      (p) => p.name.toLowerCase() === personInput.trim().toLowerCase()
    );
    if (exists) {
      setErrorMessage("This person is already added.");
      return;
    }
    setPeople((prev) => [
      ...prev,
      { name: personInput.trim(), color: getRandomColor() },
    ]);
    setPersonInput("");
  };

  const handleRemovePerson = (name: string) => {
    setPeople((prev) => prev.filter((p) => p.name !== name));
    setCurrentReceipt((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item) => {
        if (!item.assignedTo?.includes(name)) return item;
        const filtered = item.assignedTo.filter((n) => n !== name);
        const percentages = { ...item.percentages };
        delete percentages[name];
        const unique = Array.from(new Set(filtered));
        if (unique.length > 0) {
          const equal = 100 / unique.length;
          unique.forEach((person) => {
            percentages[person] = equal;
          });
        }
        return { ...item, assignedTo: unique, percentages };
      });
      return { ...prev, items };
    });
  };

  const updateReceiptItem = (
    index: number,
    updater: (item: ReceiptItem) => ReceiptItem
  ) => {
    setCurrentReceipt((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[index] = updater(items[index]);
      return { ...prev, items };
    });
  };

  const toggleAssignment = (itemIndex: number, personName: string) => {
    updateReceiptItem(itemIndex, (item) => {
      const assigned = new Set(item.assignedTo ?? []);
      if (assigned.has(personName)) {
        assigned.delete(personName);
      } else {
        assigned.add(personName);
      }
      const unique = Array.from(assigned);
      const percentages = { ...item.percentages };

      if (assigned.has(personName)) {
        const equal = 100 / unique.length;
        unique.forEach((name) => {
          percentages[name] = equal;
        });
      } else {
        delete percentages[personName];
        if (unique.length) {
          const equal = 100 / unique.length;
          unique.forEach((name) => {
            percentages[name] = equal;
          });
        }
      }

      return { ...item, assignedTo: unique, percentages };
    });
  };

  const updatePercentage = (
    itemIndex: number,
    personName: string,
    rawValue: number
  ) => {
    updateReceiptItem(itemIndex, (item) => {
      const percentages = { ...item.percentages };
      const assigned = Array.from(new Set(item.assignedTo ?? []));
      const value = Math.max(0, Math.min(100, rawValue));
      percentages[personName] = value;

      if (assigned.length === 2) {
        const other = assigned.find((name) => name !== personName);
        if (other) {
          percentages[other] = Math.max(0, Math.min(100, 100 - value));
        }
      }

      return { ...item, percentages };
    });
  };

  const splitItemEvenly = (itemIndex: number) => {
    updateReceiptItem(itemIndex, (item) => {
      const names = people.map((person) => person.name);
      const equal = names.length ? 100 / names.length : 0;
      const percentages: Record<string, number> = {};
      names.forEach((name) => {
        percentages[name] = equal;
      });
      return { ...item, assignedTo: names, percentages };
    });
  };

  const resetItemToEqual = (itemIndex: number) => {
    updateReceiptItem(itemIndex, (item) => {
      const unique = Array.from(new Set(item.assignedTo ?? []));
      if (!unique.length) return item;
      const equal = 100 / unique.length;
      const percentages = { ...item.percentages };
      unique.forEach((name) => {
        percentages[name] = equal;
      });
      return { ...item, percentages };
    });
  };

  const calculateSplit = () => {
    if (!currentReceipt) {
      setErrorMessage("Analyze a receipt first.");
      return;
    }
    if (people.length === 0) {
      setErrorMessage("Add at least one person before splitting.");
      setCurrentStep("people");
      return;
    }

    const unassignedPriced = currentReceipt.items.filter(
      (item) => itemRequiresAssignment(item) && isItemUnassigned(item)
    );
    if (unassignedPriced.length) {
      setErrorMessage(
        "Assign every priced item before calculating. Free (0) items can stay unassigned."
      );
      setCurrentStep("assignment");
      return;
    }

    const invalidPercentages = currentReceipt.items.filter((item) => {
      const unique = Array.from(new Set(item.assignedTo ?? []));
      if (!unique.length) return false;
      const total = unique.reduce(
        (sum, name) => sum + (item.percentages?.[name] || 0),
        0
      );
      return Math.abs(total - 100) > 0.5;
    });

    if (invalidPercentages.length) {
      setErrorMessage("Some items do not add up to 100%. Adjust the sliders.");
      setCurrentStep("assignment");
      return;
    }

    const peopleShares: PersonShare[] = people.map((person) => ({
      name: person.name,
      color: person.color,
      items: [],
      subtotal: 0,
      serviceCharge: 0,
      tax: 0,
      extraCharges: [],
      discount: 0,
      total: 0,
    }));

    currentReceipt.items.forEach((item) => {
      const unique = Array.from(new Set(item.assignedTo ?? []));
      if (!unique.length) return;
      unique.forEach((name) => {
        const person = peopleShares.find((share) => share.name === name);
        if (!person) return;
        const percentage =
          item.percentages?.[name] || 100 / Math.max(unique.length, 1);
        const shareAmount = item.total * (percentage / 100);
        person.items.push({
          name: item.name,
          translatedName: item.translatedName,
          quantity: item.quantity * (percentage / 100),
          price: shareAmount,
          percentage,
        });
        person.subtotal += shareAmount;
      });
    });

    const totalSubtotal = peopleShares.reduce(
      (sum, person) => sum + person.subtotal,
      0
    );

    const discountTotal = currentReceipt.discount || 0;

    if (totalSubtotal > 0) {
      peopleShares.forEach((person) => {
        const proportion = person.subtotal / totalSubtotal;
        person.serviceCharge = currentReceipt.serviceCharge * proportion;
        person.tax = currentReceipt.tax * proportion;
        person.extraCharges = currentReceipt.extraCharges.map((charge) => ({
          name: charge.name,
          amount: charge.amount * proportion,
        }));
        const extrasTotal = person.extraCharges.reduce(
          (sum, charge) => sum + charge.amount,
          0
        );
        person.discount = discountTotal * proportion;
        person.total =
          person.subtotal +
          person.serviceCharge +
          person.tax +
          extrasTotal +
          person.discount;
      });
    } else {
      peopleShares.forEach((person) => {
        person.discount = 0;
      });
    }

    if (currentReceipt.currency !== "IDR" && currentReceipt.exchangeRate) {
      peopleShares.forEach((person) => {
        person.totalIdr = person.total * currentReceipt.exchangeRate;
      });
    }

    setResults(peopleShares);
    setCurrentStep("results");
  };

  const buildResultsSummary = (peopleShares: PersonShare[]) => {
    if (!currentReceipt) return "";
    const lines = [
      "Bill Splitter results",
      "",
      ...peopleShares.flatMap((person) => [
        `${person.name} - ${formatCurrency(person.total, currentReceipt.currency)}${
          person.totalIdr ? ` (≈ ${formatCurrency(person.totalIdr)})` : ""
        }`,
        ...person.items.map((item) => {
          const displayName = item.translatedName
            ? `${item.translatedName} (${item.name})`
            : item.name;
          return `  • ${displayName} (${item.percentage.toFixed(1)}%) -> ${formatCurrency(
            item.price,
            currentReceipt.currency
          )}`;
        }),
        `  Service Charge: ${formatCurrency(person.serviceCharge, currentReceipt.currency)}`,
        `  Tax: ${formatCurrency(person.tax, currentReceipt.currency)}`,
        ...person.extraCharges.map(
          (charge) =>
            `  ${charge.name}: ${formatCurrency(charge.amount, currentReceipt.currency)}`
        ),
        ...(person.discount !== 0
          ? [`  Discount: ${formatCurrency(person.discount, currentReceipt.currency)}`]
          : []),
        "",
      ]),
      `Grand Total: ${formatCurrency(
        peopleShares.reduce((sum, person) => sum + person.total, 0),
        currentReceipt.currency
      )}`,
    ];

    const unassignedItems = currentReceipt.items.filter(
      (item) => itemRequiresAssignment(item) && isItemUnassigned(item)
    );

    if (unassignedItems.length > 0) {
      const unassignedTotal = unassignedItems.reduce(
        (sum, item) => sum + item.total,
        0
      );
      lines.push(
        "",
        "Unassigned Items:",
        ...unassignedItems.map(
          (item) =>
            `  • ${item.name} -> ${formatCurrency(item.total, currentReceipt.currency)}`
        ),
        `  Unassigned Total: ${formatCurrency(unassignedTotal, currentReceipt.currency)}`
      );
    }

    lines.push(
      "",
      `Grand Total (Assigned): ${formatCurrency(
        peopleShares.reduce((sum, person) => sum + person.total, 0)
      )}`
    );

    return lines.join("\n");
  };

  const shareResults = async () => {
    if (!results || !results.length) return;
    const summaryText = buildResultsSummary(results);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Bill Splitter results",
          text: summaryText,
        });
        setShareNotice("Shared via the system share sheet.");
        setTimeout(() => setShareNotice(null), 4000);
        return;
      } catch (error) {
        if (error && (error as Error).name === "AbortError") {
          return;
        }
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(summaryText);
        setShareNotice("Summary copied to clipboard.");
        setTimeout(() => setShareNotice(null), 4000);
        return;
      } catch {
        // fall through
      }
    }

    alert("Unable to share automatically. Please copy the summary manually.");
  };

  const stepIndex = STEP_ORDER.indexOf(currentStep);

  const canNavigateToStep = (step: Step) => {
    if (step === "upload") return true;
    if (step === "review" || step === "people") {
      return Boolean(currentReceipt);
    }
    if (step === "assignment") {
      return Boolean(currentReceipt && people.length > 0);
    }
    if (step === "results") {
      return Boolean(results && currentReceipt);
    }
    return false;
  };

  const showSection = (section: Step) =>
    section === currentStep && canNavigateToStep(section);

  const handleStepClick = (step: Step) => {
    if (!canNavigateToStep(step)) return;
    setCurrentStep(step);
  };

  const handleStartOver = () => {
    handleResetUpload();
    setPersonInput("");
    setResults(null);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sb-slate)]">
          Receipt ledger
        </p>
        <h1 className="sb-heading text-3xl sm:text-4xl">Bill Splitter</h1>
        <p className="max-w-2xl text-sm text-[var(--sb-slate)]">
          Upload a receipt, let a vision model read the line items, then divide
          the total fairly across everyone at the table.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setShowConfigModal(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            AI settings
          </Button>
          <Button
            variant="ghost"
            onClick={handleCopyShareableConfig}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share config
          </Button>
        </div>
        <div className="space-y-1 text-xs text-[var(--sb-slate)]">
          {configLoadedFromUrl && (
            <p>Configuration loaded from the shared link.</p>
          )}
          {shareNotice && <p>{shareNotice}</p>}
          {tokenUsage && (
            <p>
              Last run via OpenAI-compatible endpoint used{" "}
              {describeTokenUsage(tokenUsage) || "an unknown number of tokens"}.
            </p>
          )}
        </div>
      </header>

      <nav className="sb-stepper" aria-label="Progress">
        {STEP_ORDER.map((step, index) => {
          const active = currentStep === step;
          const completed = index < stepIndex;
          const clickable = canNavigateToStep(step);
          return (
            <button
              key={step}
              type="button"
              className="sb-step"
              data-active={active}
              data-complete={completed}
              disabled={!clickable}
              onClick={() => handleStepClick(step)}
            >
              {String(index + 1).padStart(2, "0")} · {STEP_META[step].label}
            </button>
          );
        })}
      </nav>

      {showSection("upload") && (
        <section className="sb-card space-y-6 p-6">
          <header className="space-y-1">
            <h2 className="sb-heading text-lg">Upload receipt</h2>
            <p className="text-sm text-[var(--sb-slate)]">
              Drag and drop a photo or browse. Files stay in your browser.
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
              handleFileDrop(e.dataTransfer.files);
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
                handleFileDrop(event.target.files);
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
                      handleResetUpload();
                    }}
                  >
                    Remove
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!previewUrl || !selectedFile) {
                        setErrorMessage("Upload a receipt before cropping.");
                        return;
                      }
                      setShowCropModal(true);
                    }}
                  >
                    Crop receipt
                  </Button>
                  {hasCroppedImage && (
                    <Button
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleResetCrop();
                      }}
                    >
                      Reset crop
                    </Button>
                  )}
                  <Button
                    onClick={(event) => {
                      event.stopPropagation();
                      analyzeReceipt();
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
        </section>
      )}

      {showSection("review") && currentReceipt && (
        <section className="sb-card space-y-6 p-6">
          <header className="space-y-1">
            <h2 className="sb-heading text-lg">Review the parsed receipt</h2>
            <p className="text-sm text-[var(--sb-slate)]">
              Confirm the merchant details and totals before splitting.
            </p>
          </header>

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
                        setCurrentReceipt({
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
                          setCurrentReceipt({
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
                      {item.total === 0
                        ? "Free / note"
                        : `item #${index + 1}`}
                    </p>
                  </div>
                  <p className="sb-amount font-medium text-[var(--sb-ink)]">
                    {formatCurrency(item.total, currentReceipt.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setCurrentStep("upload")}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep("people")}>Continue</Button>
            </div>
          </div>
        </section>
      )}

      {showSection("people") && (
        <section className="sb-card space-y-6 p-6">
          <header className="space-y-1">
            <h2 className="sb-heading text-lg">Add people</h2>
            <p className="text-sm text-[var(--sb-slate)]">
              Everyone listed receives an itemized share.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-4 md:col-span-2">
              <Label htmlFor="personName" className="text-sm font-medium">
                Person name
              </Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="personName"
                  placeholder="e.g. Alice, Bob..."
                  value={personInput}
                  onChange={(e) => setPersonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPerson();
                    }
                  }}
                />
                <Button onClick={handleAddPerson} className="whitespace-nowrap">
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
            <div className="flex flex-wrap gap-3">
              {people.map((person) => (
                <span
                  key={person.name}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--sb-line)] px-4 py-1.5 text-sm font-medium text-[var(--sb-ink)]"
                  style={{ backgroundColor: `${person.color}1a` }}
                >
                  {person.name}
                  <button
                    className="text-xs opacity-70 hover:opacity-100"
                    onClick={() => handleRemovePerson(person.name)}
                    aria-label={`Remove ${person.name}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--sb-slate)]">No one added yet.</p>
          )}

          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep("review")}>
              Back to review
            </Button>
            <Button
              onClick={() => setCurrentStep("assignment")}
              disabled={people.length === 0}
            >
              Go to assignment
            </Button>
          </div>
        </section>
      )}

      {showSection("assignment") && currentReceipt && people.length > 0 && (
        <section className="sb-card space-y-6 p-6">
          <header className="space-y-1">
            <h2 className="sb-heading text-lg">Assign items</h2>
            <p className="text-sm text-[var(--sb-slate)]">
              Select an item to distribute it. Two people auto-balance to 100%.
              Free (0) items are optional.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                Items
              </p>
              {currentReceipt.items.map((item, index) => (
                <ItemAssignRow
                  key={`${item.name}-${index}`}
                  item={item}
                  people={people}
                  currency={currentReceipt.currency}
                  requiresAssignment={itemRequiresAssignment(item)}
                  onTogglePerson={(personName) => toggleAssignment(index, personName)}
                  onSplitAll={() => splitItemEvenly(index)}
                  onChangePercentage={(personName, value) =>
                    updatePercentage(index, personName, value)
                  }
                  onResetEqual={() => resetItemToEqual(index)}
                />
              ))}
            </div>

            <AssignmentTotals
              summary={assignmentSummary}
              currency={currentReceipt.currency}
              onCalculate={calculateSplit}
              calculateDisabled={people.length === 0 || hasUnassignedPricedItems}
              blockedMessage={
                hasUnassignedPricedItems
                  ? "Assign all priced items to continue. Free (0) items can stay unassigned."
                  : undefined
              }
            />
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep("people")}>
              Back to people
            </Button>
            <Button variant="ghost" onClick={handleStartOver}>
              Start over
            </Button>
          </div>
        </section>
      )}

      {showSection("results") && results && currentReceipt && (
        <section className="sb-card space-y-6 p-6">
          <header className="space-y-1">
            <h2 className="sb-heading text-lg">Per-person totals</h2>
            <p className="text-sm text-[var(--sb-slate)]">
              Totals include proportional service charge, tax, and fees.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {results.map((person) => (
              <div
                key={person.name}
                className="rounded-lg border border-[var(--sb-line)] p-5"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full font-semibold text-white"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="sb-heading text-lg">{person.name}</p>
                    <p className="text-sm text-[var(--sb-slate)]">
                      Pays{" "}
                      <span className="sb-amount font-medium text-[var(--sb-accent)]">
                        {formatCurrency(person.total, currentReceipt.currency)}
                      </span>
                      {person.totalIdr && (
                        <span className="sb-amount block text-xs text-[var(--sb-slate)]">
                          ≈ {formatCurrency(person.totalIdr)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {person.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex justify-between text-[var(--sb-slate)]"
                    >
                      <span>
                        {item.translatedName ? (
                          <>
                            {item.translatedName}{" "}
                            <span className="text-xs opacity-70">({item.name})</span>{" "}
                            <span className="text-xs opacity-70">
                              ({item.percentage.toFixed(1)}%)
                            </span>
                          </>
                        ) : (
                          <>
                            {item.name}{" "}
                            <span className="text-xs opacity-70">
                              ({item.percentage.toFixed(1)}%)
                            </span>
                          </>
                        )}
                      </span>
                      <span className="sb-amount">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2 border-t border-[var(--sb-line)] pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--sb-slate)]">Items</span>
                    <span className="sb-amount">{formatCurrency(person.subtotal)}</span>
                  </div>
                  {person.serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--sb-slate)]">Service charge</span>
                      <span className="sb-amount">
                        {formatCurrency(person.serviceCharge)}
                      </span>
                    </div>
                  )}
                  {person.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--sb-slate)]">Tax</span>
                      <span className="sb-amount">{formatCurrency(person.tax)}</span>
                    </div>
                  )}
                  {person.extraCharges.map((charge, index) => (
                    <div className="flex justify-between" key={index}>
                      <span className="text-[var(--sb-slate)]">{charge.name}</span>
                      <span className="sb-amount">{formatCurrency(charge.amount)}</span>
                    </div>
                  ))}
                  {person.discount !== 0 && (
                    <div className="flex justify-between font-medium text-[var(--sb-accent)]">
                      <span>Discount</span>
                      <span className="sb-amount">{formatCurrency(person.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[var(--sb-line)] pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span className="sb-amount text-[var(--sb-accent)]">
                      {formatCurrency(person.total, currentReceipt.currency)}
                    </span>
                  </div>
                  {person.totalIdr && (
                    <div className="flex justify-between pt-1 text-sm text-[var(--sb-slate)]">
                      <span>In IDR</span>
                      <span className="sb-amount">{formatCurrency(person.totalIdr)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-[var(--sb-line)] p-5">
            {(() => {
              const unassignedItems = currentReceipt.items.filter(
                (item) => itemRequiresAssignment(item) && isItemUnassigned(item)
              );
              if (unassignedItems.length === 0) return null;
              const unassignedTotal = unassignedItems.reduce(
                (sum, item) => sum + item.total,
                0
              );
              return (
                <div className="rounded-md border border-dashed border-[var(--sb-line)] p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                    Unassigned items
                  </h3>
                  <div className="space-y-2 text-sm text-[var(--sb-slate)]">
                    {unassignedItems.map((item, index) => (
                      <div key={`unassigned-${index}`} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="sb-amount">
                          {formatCurrency(item.total, currentReceipt.currency)}
                        </span>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t border-[var(--sb-line)] pt-2 font-medium text-[var(--sb-ink)]">
                      <span>Unassigned total</span>
                      <span className="sb-amount">
                        {formatCurrency(unassignedTotal, currentReceipt.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sb-slate)]">
                  Split complete
                </p>
                <p className="sb-heading mt-1 text-2xl">
                  Total paid{" "}
                  <span className="sb-amount text-[var(--sb-accent)]">
                    {formatCurrency(
                      results.reduce((sum, person) => sum + person.total, 0)
                    )}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={shareResults}>
                  Share summary
                </Button>
                <Button onClick={handleStartOver}>Start another receipt</Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {showCropModal && previewUrl && (
        <CropModal
          imageUrl={previewUrl}
          onClose={() => setShowCropModal(false)}
          onApply={async (file) => {
            setSelectedFile(file);
            setHasCroppedImage(true);
            setShowCropModal(false);
          }}
        />
      )}

      <AiConfigModal
        open={showConfigModal}
        initialConfig={openAiConfig}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveConfig}
      />

      {loadingState && (
        <div className="sb-modal-backdrop">
          <div className="sb-modal max-w-sm space-y-3 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--sb-accent)]" />
            <p className="sb-heading text-lg">{loadingState.text}</p>
            {loadingState.subtext && (
              <p className="text-xs text-[var(--sb-slate)]">{loadingState.subtext}</p>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="sb-modal-backdrop">
          <div className="sb-modal max-w-md space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--sb-accent)]">
              Something went wrong
            </p>
            <p className="text-sm text-[var(--sb-ink)]">{errorMessage}</p>
            <Button onClick={() => setErrorMessage(null)}>Dismiss</Button>
          </div>
        </div>
      )}
    </div>
  );
}
