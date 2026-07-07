"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  FileImage,
  Images,
  Loader2,
  Receipt,
  Settings,
  Share2,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = "upload" | "review" | "people" | "assignment" | "results";

type KirbyProvider = "azure" | "gemini";

type KirbyAiConfig = {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployment: string;
  provider: KirbyProvider;
  geminiApiKey: string;
  geminiModel: string;
};

type TokenUsage = {
  provider: "azure" | "gemini";
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
};

type AnalyzeResult = {
  parsedJson: any;
  usage: TokenUsage;
};

type ExtraCharge = {
  name: string;
  amount: number;
};

type ReceiptItem = {
  name: string;
  translatedName?: string;
  quantity: number;
  price: number;
  total: number;
  assignedTo: string[];
  percentages: Record<string, number>;
};

type ReceiptData = {
  restaurant: string;
  address: string;
  date: string;
  currency: string;
  exchangeRate: number;
  items: ReceiptItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  discount: number;
  extraCharges: ExtraCharge[];
  total: number;
  computedTotal: number;
  isValid: boolean;
  error?: string;
};

type Person = {
  name: string;
  color: string;
};

type PersonShare = {
  name: string;
  color: string;
  items: {
    name: string;
    translatedName?: string;
    quantity: number;
    price: number;
    percentage: number;
  }[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  extraCharges: ExtraCharge[];
  discount: number;
  total: number;
  totalIdr?: number;
};

type CropPoint = {
  u: number;
  v: number;
};

const STEP_ORDER: Step[] = [
  "upload",
  "review",
  "people",
  "assignment",
  "results",
];

const STEP_META: Record<
  Step,
  { label: string; description: string; icon: React.ComponentType<any> }
> = {
  upload: {
    label: "Upload",
    description: "Snap or drop your receipt 📸",
    icon: Upload,
  },
  review: {
    label: "Review",
    description: "Double-check what the AI read",
    icon: Receipt,
  },
  people: {
    label: "People",
    description: "Add your crew",
    icon: Users,
  },
  assignment: {
    label: "Assign",
    description: "Who ate what?",
    icon: Images,
  },
  results: {
    label: "Results",
    description: "The damage 💸",
    icon: Sparkles,
  },
};

// Candy color per step index (presentation only)
const STEP_COLORS = [
  "var(--candy-pink)",
  "var(--candy-yellow)",
  "var(--candy-mint)",
  "var(--candy-sky)",
  "var(--candy-grape)",
];

// Per-person result card tints (hex + alpha so Tailwind v3 can compile them)
const PERSON_CARD_TINTS = [
  "bg-[#ff6fa5]/15",
  "bg-[#ffc94d]/20",
  "bg-[#4cd4a9]/15",
  "bg-[#5ab8ff]/15",
  "bg-[#a78bfa]/15",
];

const ULTRA_PRESET = {
  label: "Ultra",
  description: "Maximum context window (16k tokens) for the toughest receipts",
  maxTokens: 16384,
  temperature: 0.01,
};

const RECEIPT_PROMPT = [
  'You are a receipt parsing and reconstruction expert. Azure OCR may break lines, merge words, or misread characters. Clean the OCR text and extract billing data, returning ONLY a minified JSON with this structure:',
  '{"restaurant":"","address":"","date":"","currency":"IDR","items":[{"name":"","translatedName":"","price":0}],"subtotal":0,"serviceCharge":0,"tax":0,"discount":0,"extraCharges":[{"name":"","amount":0}],"total":0}',
  '',
  'Rules:',
  '- Keep full item names (sizes, variants, modifiers). Remove only leading quantities (e.g., "2x").',
  '- For each item, provide "translatedName" with an English translation if the original name is not in English. If already in English, set translatedName to empty string.',
  '- Use the printed line total; never recalc from quantity.',
  '- Merge wrapped lines belonging to one item and fix obvious OCR mistakes (I00→100, O→0).',
  '- Treat the rightmost numeric value on a line as the true line total; ignore unit prices on the left.',
  '- Capture service charges, PB1/Pajak/PPN/VAT/GST or similar taxes.',
  '- Record all discounts in the "discount" field. If the amount is negative, store it as-is; if only a percentage appears, store 0. Add multiple discounts together.',
  '- Extra charges include rounding, packaging, delivery, surcharges, etc., each as {"name":"","amount":number}. Negative values are allowed.',
  '- Detect the currency (e.g., IDR, USD, JPY, SGD) and set the "currency" field. Default to "IDR" if unknown.',
  '- For Indonesian Rupiah, dots/commas usually indicate thousands (145.000 => 145000) unless the format clearly shows decimals.',
  '- Convert dates to YYYY-MM-DD when possible; otherwise return an empty string.',
  '- If data is missing, use empty string or 0.',
  '- Output the JSON object only, with no commentary.',
  '- Use the printed "Total," "Grand Total," or equivalent final line as the `total` field; this is the number the customer actually paid after discounts and charges. Double-check that every component (items, service, tax, discounts, extra fees) either sums toward that final amount or is documented separately so we can trace reconciliations.',
].join('\n');

const CONFIG_STORAGE_KEY = "splitbill.kirby-config";
const GEMINI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro" },
];

const DEFAULT_KIRBY_CONFIG: KirbyAiConfig = {
  endpoint: "",
  apiKey: "",
  apiVersion: "2025-01-01-preview",
  deployment: "gpt-5-mini",
  provider: "azure",
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash",
};

const DEFAULT_CROP_POLYGON: CropPoint[] = [
  { u: 0.02, v: 0.02 },
  { u: 0.98, v: 0.02 },
  { u: 0.98, v: 0.98 },
  { u: 0.02, v: 0.98 },
];

const cloneDefaultPolygon = () =>
  DEFAULT_CROP_POLYGON.map((point) => ({ ...point }));

const COLOR_POOL = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#f5576c",
  "#4facfe",
  "#00f2fe",
  "#43e97b",
  "#38f9d7",
  "#fa709a",
  "#fee140",
  "#a8edea",
  "#fed6e3",
];

const formatCurrency = (amount: number, currency = "IDR") => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

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

const getFirstNumber = (source: Record<string, any> | undefined, ...keys: string[]) => {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return undefined;
};

const buildTokenUsage = (
  provider: TokenUsage["provider"],
  source: Record<string, any> | undefined,
  totalKeys: string[],
  promptKeys: string[],
  completionKeys: string[]
): TokenUsage => ({
  provider,
  totalTokens: getFirstNumber(source, ...totalKeys),
  promptTokens: getFirstNumber(source, ...promptKeys),
  completionTokens: getFirstNumber(source, ...completionKeys),
});

const getRandomColor = () =>
  COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];

// Optimized image processing with compression
const processImageForOCR = async (file: File, maxWidth = 1200, maxHeight = 1600, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64 with compression
      const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      resolve(base64);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Legacy function for backward compatibility
const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const [, base64] = result.split(",");
        resolve(base64 || "");
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const extractJsonObject = (content: string) => {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (_error) {
    const fallback = content.match(/\{[\s\S]*\}/);
    if (!fallback) {
      throw new Error("Unable to parse structured JSON response.");
    }
    parsed = JSON.parse(fallback[0]);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Parsed data is not a valid JSON object.");
  }
  return parsed;
};

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
  const exchangeRate = 1; // Default to 1, user can edit

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

type OcrMeta = {
  method: string;
};

type LoadingState = {
  text: string;
  subtext?: string;
} | null;

export default function SplitBillTool() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(
    null
  );
  const [people, setPeople] = useState<Person[]>([]);
  const [personInput, setPersonInput] = useState("");
  const [assignmentModalIndex, setAssignmentModalIndex] = useState<
    number | null
  >(null);
  const [results, setResults] = useState<PersonShare[] | null>(null);
  const [kirbyConfig, setKirbyConfig] =
    useState<KirbyAiConfig>(DEFAULT_KIRBY_CONFIG);
  const [configDraft, setConfigDraft] =
    useState<KirbyAiConfig>(DEFAULT_KIRBY_CONFIG);
  const [configLoadedFromUrl, setConfigLoadedFromUrl] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropPolygon, setCropPolygon] = useState<CropPoint[]>([]);
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [hasCroppedImage, setHasCroppedImage] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ocrMeta, setOcrMeta] = useState<OcrMeta | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropAreaSize, setCropAreaSize] = useState({ width: 0, height: 0 });

  const refreshCropAreaSize = useCallback(() => {
    const container = cropAreaRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    setCropAreaSize({
      width: bounds.width,
      height: bounds.height,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const endpoint = params.get("endpoint");
    const apiKey = params.get("apiKey");
    const apiVersion =
      params.get("apiVersion") || DEFAULT_KIRBY_CONFIG.apiVersion;
    const deployment =
      params.get("deployment") || DEFAULT_KIRBY_CONFIG.deployment;
    const providerParam = params.get("provider");
    const provider: KirbyProvider =
      providerParam === "gemini" ? "gemini" : "azure";
    const geminiApiKey =
      params.get("geminiKey") || DEFAULT_KIRBY_CONFIG.geminiApiKey;
    const geminiModel =
      params.get("geminiModel") || DEFAULT_KIRBY_CONFIG.geminiModel;

    if (provider === "gemini" && geminiApiKey) {
      const config: KirbyAiConfig = {
        endpoint: endpoint?.replace(/\/$/, "") || "",
        apiKey: apiKey || "",
        apiVersion,
        deployment,
        provider: "gemini",
        geminiApiKey,
        geminiModel,
      };
      setKirbyConfig(config);
      setConfigDraft(config);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      setConfigLoadedFromUrl(true);
      return;
    }

    if (provider === "azure" && endpoint && apiKey) {
      const config: KirbyAiConfig = {
        endpoint: endpoint.replace(/\/$/, ""),
        apiKey,
        apiVersion,
        deployment,
        provider: "azure",
        geminiApiKey,
        geminiModel,
      };
      setKirbyConfig(config);
      setConfigDraft(config);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      setConfigLoadedFromUrl(true);
      return;
    }

    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as KirbyAiConfig;
        const normalized: KirbyAiConfig = {
          endpoint: parsed.endpoint || "",
          apiKey: parsed.apiKey || "",
          apiVersion: parsed.apiVersion || DEFAULT_KIRBY_CONFIG.apiVersion,
          deployment: parsed.deployment || DEFAULT_KIRBY_CONFIG.deployment,
          provider: parsed.provider === "gemini" ? "gemini" : "azure",
          geminiApiKey: parsed.geminiApiKey || "",
          geminiModel:
            parsed.geminiModel || DEFAULT_KIRBY_CONFIG.geminiModel,
        };
        setKirbyConfig(normalized);
        setConfigDraft(normalized);
      } catch {
        // ignore invalid JSON
      }
    }
  }, []);

  useEffect(() => {
    if (showConfigModal) {
      setConfigDraft(kirbyConfig);
    }
  }, [showConfigModal, kirbyConfig]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setCropPolygon([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
        setCropPolygon(cloneDefaultPolygon());
      }
    };
    reader.readAsDataURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (!showCropModal) {
      setActiveHandle(null);
      return;
    }
    setActiveHandle(null);
    refreshCropAreaSize();
    window.addEventListener("resize", refreshCropAreaSize);
    return () => {
      window.removeEventListener("resize", refreshCropAreaSize);
    };
  }, [showCropModal, previewUrl, refreshCropAreaSize]);

  const assignmentSummary = useMemo(() => {
    if (!currentReceipt || people.length === 0) return [];
    return people.map((person) => {
      const personItems = currentReceipt.items.filter(
        (item) => item.assignedTo?.includes(person.name)
      );
      const subtotal = personItems.reduce((sum, item) => {
        const percentage =
          item.percentages?.[person.name] ||
          (item.assignedTo?.length
            ? 100 / new Set(item.assignedTo).size
            : 0);
        return sum + item.total * (percentage / 100);
      }, 0);
      return { ...person, subtotal, count: personItems.length };
    });
  }, [currentReceipt, people]); // More specific dependencies

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
    setCropPolygon(cloneDefaultPolygon());
    setShowCropModal(false);
  }, []);

  const handleResetUpload = useCallback(() => {
    setSelectedFile(null);
    setOriginalFile(null);
    setPreviewUrl(null);
    setCurrentReceipt(null);
    setHasCroppedImage(false);
    setShowCropModal(false);
    setCropPolygon([]);
    setResults(null);
    setOcrMeta(null);
    setPeople([]);
    setAssignmentModalIndex(null);
    setCurrentStep("upload");
    setTokenUsage(null);
  }, []);

  const handleResetCrop = () => {
    if (!originalFile) return;
    setSelectedFile(originalFile);
    setHasCroppedImage(false);
    setCropPolygon(cloneDefaultPolygon());
    setShowCropModal(false);
  };

  const handleSaveConfig = () => {
    const provider = configDraft.provider || "azure";
    if (provider === "azure") {
      if (!configDraft.endpoint.trim() || !configDraft.apiKey.trim()) {
        setErrorMessage("Endpoint and API Key are required for Azure.");
        return;
      }
    } else if (!configDraft.geminiApiKey.trim()) {
      setErrorMessage("Gemini API Key is required.");
      return;
    }
    const sanitized: KirbyAiConfig = {
      endpoint: configDraft.endpoint.trim().replace(/\/$/, ""),
      apiKey: configDraft.apiKey.trim(),
      apiVersion:
        configDraft.apiVersion.trim() || DEFAULT_KIRBY_CONFIG.apiVersion,
      deployment:
        configDraft.deployment.trim() || DEFAULT_KIRBY_CONFIG.deployment,
      provider,
      geminiApiKey: configDraft.geminiApiKey.trim(),
      geminiModel:
        configDraft.geminiModel.trim() || DEFAULT_KIRBY_CONFIG.geminiModel,
    };
    setKirbyConfig(sanitized);
    if (typeof window !== "undefined") {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(sanitized));
    }
    setShowConfigModal(false);
  };

  const generateShareableUrl = () => {
    if (typeof window === "undefined") return null;
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({
      provider: kirbyConfig.provider,
    });

    if (kirbyConfig.provider === "gemini") {
      if (!kirbyConfig.geminiApiKey) return null;
      params.set("geminiKey", kirbyConfig.geminiApiKey);
      params.set("geminiModel", kirbyConfig.geminiModel);
    } else {
      if (!kirbyConfig.endpoint || !kirbyConfig.apiKey) return null;
      params.set("endpoint", kirbyConfig.endpoint);
      params.set("apiKey", kirbyConfig.apiKey);
      params.set("apiVersion", kirbyConfig.apiVersion);
      params.set("deployment", kirbyConfig.deployment);
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const handleCopyShareableConfig = async () => {
    const url = generateShareableUrl();
    if (!url) {
      setErrorMessage("Save your AI configuration first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareNotice("Shareable URL copied!");
      setTimeout(() => setShareNotice(null), 3000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to copy URL."
      );
    }
  };

  const analyzeReceipt = async () => {
    if (isAnalyzing) return; // Prevent concurrent analysis

    if (!selectedFile) {
      setErrorMessage("Please upload a receipt first.");
      return;
    }
    const provider = kirbyConfig.provider || "azure";
    if (provider === "azure") {
      if (!kirbyConfig.endpoint || !kirbyConfig.apiKey) {
        setErrorMessage("Configure Azure OpenAI credentials first.");
        setShowConfigModal(true);
        return;
      }
    } else if (!kirbyConfig.geminiApiKey) {
      setErrorMessage("Provide your Gemini API key first.");
      setShowConfigModal(true);
      return;
    }

    const analyzeWithAzure = async (imageBase64: string): Promise<AnalyzeResult> => {
      const url = `${kirbyConfig.endpoint}/openai/deployments/${kirbyConfig.deployment}/chat/completions?api-version=${kirbyConfig.apiVersion}`;
      const requestBody: any = {
        model: kirbyConfig.deployment,
        messages: [
          { role: "system", content: RECEIPT_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this receipt image and respond with the JSON described above.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: ULTRA_PRESET.maxTokens,
      };
      const normalizedDeployment = (kirbyConfig.deployment || "").toLowerCase();
      if (!normalizedDeployment.includes("gpt-5")) {
        requestBody.temperature = ULTRA_PRESET.temperature;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": kirbyConfig.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = `Azure OpenAI error: ${response.status}`;

        // Provide more specific error messages
        if (response.status === 401) {
          errorMessage = "Invalid API key. Please check your Azure OpenAI credentials.";
        } else if (response.status === 403) {
          errorMessage = "Access denied. Please check your Azure OpenAI permissions.";
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please try again in a moment.";
        } else if (response.status === 400) {
          errorMessage = "Invalid request. Please check your API configuration.";
        } else if (response.status >= 500) {
          errorMessage = "Azure OpenAI service temporarily unavailable. Please try again.";
        }

        throw new Error(`${errorMessage} (${text.slice(0, 100)}...)`);
      }
      const data = await response.json();
      const jsonText = data?.choices?.[0]?.message?.content;
      if (!jsonText) {
        throw new Error("Azure OpenAI response did not include parsed content.");
      }
      const usage = buildTokenUsage(
        "azure",
        data?.usage ?? data?.usageMetadata ?? data?.tokenUsage,
        ["total_tokens", "totalTokens", "totalTokenCount", "total"],
        ["prompt_tokens", "promptTokens", "prompt", "promptTokenCount"],
        ["completion_tokens", "completionTokens", "completion", "completionTokenCount"]
      );
      return {
        parsedJson: extractJsonObject(jsonText),
        usage,
      };
    };

    const analyzeWithGemini = async (imageBase64: string): Promise<AnalyzeResult> => {
      const model =
        kirbyConfig.geminiModel || DEFAULT_KIRBY_CONFIG.geminiModel;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${kirbyConfig.geminiApiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${RECEIPT_PROMPT}\n\nAnalyze this receipt image and respond with the JSON described above.`,
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: ULTRA_PRESET.temperature,
            maxOutputTokens: ULTRA_PRESET.maxTokens,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        let errorMessage = `Gemini error: ${response.status}`;

        // Provide more specific error messages for Gemini
        if (response.status === 400) {
          errorMessage = "Invalid request to Gemini API. Please check your API key.";
        } else if (response.status === 401) {
          errorMessage = "Invalid Gemini API key. Please check your credentials.";
        } else if (response.status === 403) {
          errorMessage = "Gemini API access denied. Please check your API key permissions.";
        } else if (response.status === 429) {
          errorMessage = "Gemini API rate limit exceeded. Please try again in a moment.";
        } else if (response.status === 500) {
          errorMessage = "Gemini service temporarily unavailable. Please try again.";
        }

        throw new Error(`${errorMessage} (${text.slice(0, 100)}...)`);
      }
      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      const text = parts
        ?.map((part: { text?: string }) => part.text)
        .filter(Boolean)
        .join("\n");
      if (!text) {
        throw new Error("Gemini response did not include parsed content.");
      }
      const usage = buildTokenUsage(
        "gemini",
        data?.usageMetadata ?? data?.usage ?? data?.tokenUsage,
        ["totalTokenCount", "total_token_count", "total_tokens", "totalToken", "total"],
        ["promptTokenCount", "prompt_token_count", "prompt_tokens", "promptTokens", "prompt"],
        ["candidatesTokenCount", "completion_token_count", "completion_tokens", "completionTokens", "completion"]
      );
      return {
        parsedJson: extractJsonObject(text),
        usage,
      };
    };

    setIsAnalyzing(true);
    setErrorMessage(null);
    setTokenUsage(null);

    try {
      setLoadingState({
        text: "Analyzing receipt...",
        subtext: "Compressing image for upload",
      });

      // Use optimized image processing for OCR
      const imageBase64 = await processImageForOCR(selectedFile);

      setLoadingState({
        text: "Analyzing receipt...",
        subtext: "Extracting items via vision model",
      });

      const { parsedJson, usage } =
        provider === "gemini"
          ? await analyzeWithGemini(imageBase64)
          : await analyzeWithAzure(imageBase64);

      const receipt = parseReceipt(parsedJson);
      if (!receipt.items.length) {
        throw new Error("No items detected. Try a clearer photo or crop to focus on the receipt text.");
      }

      setCurrentReceipt(receipt);
      setTokenUsage(usage);
      setOcrMeta({
        method: `Vision OCR · ${ULTRA_PRESET.label}`,
      });
      setCurrentStep("review");
    } catch (error) {
      let errorMessage = "Failed to analyze receipt.";

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timed out. The image might be too large or the API is slow. Try cropping the image or using a smaller quality setting.";
        } else if (error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      setErrorMessage(errorMessage);
    } finally {
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
    setPeople((prev) => [...prev, { name: personInput.trim(), color: getRandomColor() }]);
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
        return {
          ...item,
          assignedTo: unique,
          percentages,
        };
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

      return {
        ...item,
        assignedTo: unique,
        percentages,
      };
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

      return {
        ...item,
        percentages,
      };
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

    // Unassigned items check removed to allow partial splitting
    // The unassigned items will be displayed in the results summary


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
      setErrorMessage(
        "Some items do not add up to 100%. Please adjust the sliders."
      );
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

    // Calculate IDR equivalent if needed
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
      "SplitBill Results",
      "",
      ...peopleShares.flatMap((person) => [
        `${person.name} - ${formatCurrency(person.total, currentReceipt.currency)}${person.totalIdr ? ` (≈ ${formatCurrency(person.totalIdr)})` : ""}`,
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
          (charge) => `  ${charge.name}: ${formatCurrency(charge.amount, currentReceipt.currency)}`
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
      (item) => !item.assignedTo || item.assignedTo.length === 0
    );

    if (unassignedItems.length > 0) {
      const unassignedTotal = unassignedItems.reduce((sum, item) => sum + item.total, 0);
      lines.push(
        "",
        "Unassigned Items:",
        ...unassignedItems.map(
          (item) => `  • ${item.name} -> ${formatCurrency(item.total, currentReceipt.currency)}`
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
          title: "SplitBill results",
          text: summaryText,
        });
        setShareNotice("Shared bill via system share sheet");
        setTimeout(() => setShareNotice(null), 4000);
        return;
      } catch (error) {
        // If user cancels share, silently ignore, otherwise fall back.
        if (error && (error as Error).name === "AbortError") {
          return;
        }
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(summaryText);
        setShareNotice("Bill summary copied to clipboard");
        setTimeout(() => setShareNotice(null), 4000);
        return;
      } catch {
        // ignore and fall through
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
  const getActivePolygon = () =>
    cropPolygon.length ? cropPolygon : cloneDefaultPolygon();

  const updateHandlePosition = useCallback(
    (index: number, clientX: number, clientY: number) => {
      const container = cropAreaRef.current;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const clamp = (value: number) =>
        Math.min(Math.max(value, 0), 1);
      const u = clamp((clientX - bounds.left) / bounds.width);
      const v = clamp((clientY - bounds.top) / bounds.height);
      setCropPolygon((prev) => {
        const base = prev.length ? prev : cloneDefaultPolygon();
        return base.map((point, idx) =>
          idx === index ? { u, v } : { ...point }
        );
      });
    },
    []
  );

  const handleHandlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    index: number
  ) => {
    event.preventDefault();
    updateHandlePosition(index, event.clientX, event.clientY);
    setActiveHandle(index);
  };

  useEffect(() => {
    if (activeHandle === null) return;
    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateHandlePosition(activeHandle, event.clientX, event.clientY);
    };
    const stopDragging = () => setActiveHandle(null);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [activeHandle, updateHandlePosition]);

  const handleResetHandles = () => {
    setCropPolygon(cloneDefaultPolygon());
  };

  const handleCropImageLoad = () => {
    refreshCropAreaSize();
  };

  const handleApplyCrop = async () => {
    if (isCropping) return; // Prevent concurrent cropping

    const polygon = getActivePolygon();
    if (!polygon.length || !cropImageRef.current || !selectedFile) {
      setErrorMessage("Adjust the crop handles to highlight the receipt.");
      return;
    }

    setIsCropping(true);
    setErrorMessage(null);

    try {
      const imageElement = cropImageRef.current;
      const scaledPoints = polygon.map((point) => ({
        x: point.u * imageElement.naturalWidth,
        y: point.v * imageElement.naturalHeight,
      }));
      const xs = scaledPoints.map((p) => p.x);
      const ys = scaledPoints.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const sw = Math.round(maxX - minX);
      const sh = Math.round(maxY - minY);

      if (!Number.isFinite(sw) || !Number.isFinite(sh) || sw < 10 || sh < 10) {
        setErrorMessage("Crop selection is too small to process.");
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      try {
        canvas.width = sw;
        canvas.height = sh;

        if (!ctx) {
          setErrorMessage("Unable to crop image in this browser.");
          return;
        }

        // Optimize canvas operations
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.save();
        ctx.beginPath();
        scaledPoints.forEach((point, index) => {
          const dx = point.x - minX;
          const dy = point.y - minY;
          if (index === 0) {
            ctx.moveTo(dx, dy);
          } else {
            ctx.lineTo(dx, dy);
          }
        });
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(imageElement, minX, minY, sw, sh, 0, 0, sw, sh);
        ctx.restore();

        // Fill background with white (better for OCR)
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, sw, sh);

        // Use JPEG for better compression and OCR compatibility
        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);

        const response = await fetch(croppedDataUrl);
        const blob = await response.blob();
        const baseName =
          (selectedFile.name?.replace(/\.[^.]+$/, "") || "receipt") +
          "-cropped.jpg";
        const croppedFile = new File([blob], baseName, { type: "image/jpeg" });

        setSelectedFile(croppedFile);
        setHasCroppedImage(true);
        setShowCropModal(false);
      } finally {
        // Clean up canvas to prevent memory leaks
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to crop the image. Please try again."
      );
    } finally {
      setIsCropping(false);
    }
  };

  const polygonForRendering = getActivePolygon();
  const polygonBounds = polygonForRendering.length
    ? {
      minU: Math.min(...polygonForRendering.map((point) => point.u)),
      maxU: Math.max(...polygonForRendering.map((point) => point.u)),
      minV: Math.min(...polygonForRendering.map((point) => point.v)),
      maxV: Math.max(...polygonForRendering.map((point) => point.v)),
    }
    : null;
  const displayPolygonPoints =
    cropAreaSize.width > 0 && cropAreaSize.height > 0
      ? polygonForRendering.map((point) => ({
        x: point.u * cropAreaSize.width,
        y: point.v * cropAreaSize.height,
      }))
      : [];
  const selectionDisplayInfo =
    polygonBounds && cropAreaSize.width > 0 && cropAreaSize.height > 0
      ? {
        width: Math.round(
          (polygonBounds.maxU - polygonBounds.minU) * cropAreaSize.width
        ),
        height: Math.round(
          (polygonBounds.maxV - polygonBounds.minV) * cropAreaSize.height
        ),
      }
      : null;
  const selectionNaturalInfo =
    polygonBounds && cropImageRef.current
      ? {
        width: Math.round(
          (polygonBounds.maxU - polygonBounds.minU) *
          cropImageRef.current.naturalWidth
        ),
        height: Math.round(
          (polygonBounds.maxV - polygonBounds.minV) *
          cropImageRef.current.naturalHeight
        ),
      }
      : null;
  const isCropSelectionValid =
    !!selectionNaturalInfo &&
    selectionNaturalInfo.width >= 10 &&
    selectionNaturalInfo.height >= 10;

  return (
    <div className="space-y-8">
      <div>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mono-label"
        >
          🧾 friendship saver
        </motion.p>
        <motion.h1
          className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Bill Splitter
        </motion.h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70">
          Snap the receipt, let AI read it, split it fairly. No more &apos;I
          only had water&apos; drama.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setShowConfigModal(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            AI Settings
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
        {configLoadedFromUrl && (
          <div className="chip mt-3 bg-[#4cd4a9]/40">
            <Sparkles className="h-3.5 w-3.5" />
            config loaded from URL ✨
          </div>
        )}
        {shareNotice && (
          <div className="chip ml-2 mt-3 bg-[#5ab8ff]/40">
            <Share2 className="h-3.5 w-3.5" />
            {shareNotice}
          </div>
        )}
        <div className="mt-3 space-y-1">
          <p className="text-xs text-foreground/60">
            Every receipt gets the full 16,384-token brainpower — no tier
            juggling needed.
          </p>
          {tokenUsage && (
            <p className="text-xs text-foreground/60">
              Last OCR run via{" "}
              {tokenUsage.provider === "azure" ? "Azure OpenAI" : "Google Gemini"}{" "}
              used {describeTokenUsage(tokenUsage) || "an unknown number of tokens"}.
            </p>
          )}
        </div>
      </div>

      <div className="card-surface flex flex-col gap-2 p-3 sm:flex-row sm:items-stretch">
        {STEP_ORDER.map((step, index) => {
          const active = currentStep === step;
          const completed = index < stepIndex;
          const clickable = canNavigateToStep(step);
          const candy = STEP_COLORS[index % STEP_COLORS.length];
          return (
            <button
              key={step}
              type="button"
              onClick={() => clickable && handleStepClick(step)}
              className={cn(
                "flex flex-1 items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                active || completed
                  ? "border-foreground shadow-[3px_3px_0_var(--ink)]"
                  : "border-foreground/20 bg-card",
                active && "-translate-y-0.5",
                clickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              )}
              style={
                active || completed ? { backgroundColor: candy } : undefined
              }
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 font-mono text-xs font-bold",
                  active || completed
                    ? "border-foreground bg-card text-foreground"
                    : "border-foreground/30 bg-card text-foreground/50"
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-xs font-extrabold uppercase tracking-wide",
                    active || completed
                      ? "text-foreground"
                      : "text-foreground/50"
                  )}
                >
                  {STEP_META[step].label}
                </span>
                <span
                  className={cn(
                    "hidden text-xs xl:block",
                    active || completed
                      ? "text-foreground/70"
                      : "text-foreground/40"
                  )}
                >
                  {STEP_META[step].description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {showSection("upload") && (
        <section className="card-surface space-y-6 p-6">
          <header className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-[var(--candy-pink)] text-foreground shadow-[2px_2px_0_var(--ink)]">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Upload your receipt 🧾
                </h2>
                <p className="text-sm text-foreground/60">
                  Drag &amp; drop a photo or click to browse
                </p>
              </div>
            </div>
          </header>

          <div
            className={cn(
              "cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors hover:border-[var(--candy-pink)] hover:bg-[#ff6fa5]/10",
              selectedFile ? "border-[var(--candy-pink)]" : "border-foreground/30"
            )}
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
              if (target?.closest("button")) {
                return;
              }
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (event) =>
                handleFileDrop((event.target as HTMLInputElement).files);
              input.click();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                handleFileDrop(event.target.files);
                if (event.target) {
                  event.target.value = "";
                }
              }}
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-full max-w-xl mx-auto aspect-[3/4]">
                  <Image
                    src={previewUrl}
                    alt="Receipt preview"
                    fill
                    sizes="(max-width: 768px) 90vw, 480px"
                    className="rounded-xl border-2 border-foreground bg-secondary/60 object-contain shadow-[3px_3px_0_var(--ink)]"
                  />
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
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
                    {loadingState ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing
                      </span>
                    ) : (
                      "Analyze Receipt"
                    )}
                  </Button>
                </div>
                <p className="w-full text-center text-xs text-foreground/60">
                  {hasCroppedImage
                    ? "Cropped version in use. Re-open Crop to adjust. ✂️"
                    : "Tip: crop to the receipt text to remove background clutter and improve OCR accuracy."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <FileImage className="mx-auto h-12 w-12 text-foreground/30" />
                <p className="text-lg font-bold text-foreground">
                  Drop your receipt here 🍕
                </p>
                <p className="text-sm text-foreground/60">
                  Supports JPG, PNG, HEIC. Files never leave your browser —
                  pinky promise.
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
        <section className="card-surface space-y-6 p-6">
          <header className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-[var(--candy-yellow)] text-foreground shadow-[2px_2px_0_var(--ink)]">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Did the AI get it right?
              </h2>
              <p className="text-sm text-foreground/60">
                Confirm the merchant info and totals before splitting
              </p>
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border-2 border-foreground bg-[#ffc94d]/15 p-5 shadow-[3px_3px_0_var(--ink)]">
              <p className="mono-label">🏠 the place</p>
              <p className="text-xl font-bold text-foreground">
                {currentReceipt.restaurant || "Restaurant name not detected"}
              </p>
              <p className="text-sm text-foreground/60">
                {currentReceipt.address || "Address not detected"}
              </p>
              <p className="text-sm text-foreground/60">
                {currentReceipt.date || "Date not detected"}
              </p>
              {ocrMeta && (
                <p className="text-xs text-foreground/60">
                  Parsed via {ocrMeta.method}
                </p>
              )}

              <div className="space-y-3 border-t-2 border-foreground/20 pt-4">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="currency" className="text-xs font-extrabold uppercase tracking-wider text-foreground/60">Currency</Label>
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
                      <Label htmlFor="exchangeRate" className="text-xs font-extrabold uppercase tracking-wider text-foreground/60">Rate to IDR</Label>
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
                  <p className="text-xs font-bold text-foreground/70">
                    1 {currentReceipt.currency} ={" "}
                    <span className="font-mono">{formatCurrency(currentReceipt.exchangeRate)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border-2 border-foreground bg-[#5ab8ff]/15 p-5 shadow-[3px_3px_0_var(--ink)]">
              <p className="mono-label">🧾 bill summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/60">Items total</span>
                  <span className="font-mono">{formatCurrency(currentReceipt.subtotal, currentReceipt.currency)}</span>
                </div>
                {currentReceipt.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Service charge</span>
                    <span className="font-mono">{formatCurrency(currentReceipt.serviceCharge, currentReceipt.currency)}</span>
                  </div>
                )}
                {currentReceipt.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Tax</span>
                    <span className="font-mono">{formatCurrency(currentReceipt.tax, currentReceipt.currency)}</span>
                  </div>
                )}
                {currentReceipt.extraCharges.map((charge) => (
                  <div className="flex justify-between" key={charge.name}>
                    <span className="text-foreground/60">{charge.name}</span>
                    <span className="font-mono">{formatCurrency(charge.amount, currentReceipt.currency)}</span>
                  </div>
                ))}
                {currentReceipt.discount !== 0 && (
                  <div className="flex justify-between font-bold text-[var(--candy-mint)]">
                    <span>Discount 🎁</span>
                    <span className="font-mono">{formatCurrency(currentReceipt.discount, currentReceipt.currency)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t-2 border-foreground/20 pt-3 text-lg font-bold">
                  <span>Total</span>
                  <span className="font-mono text-[var(--candy-pink)]">{formatCurrency(currentReceipt.total, currentReceipt.currency)}</span>
                </div>
                {!currentReceipt.isValid && (
                  <p className="rounded-lg border-2 border-foreground bg-[#ffc94d]/40 px-3 py-2 text-xs font-bold text-foreground">
                    🤔 Totals don&apos;t add up perfectly. Double-check the numbers.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-foreground bg-[#ff6fa5]/10 p-5 shadow-[3px_3px_0_var(--ink)]">
            <p className="mono-label mb-4">🍕 what you ordered</p>
            <div className="space-y-3">
              {currentReceipt.items.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between rounded-xl border-2 border-foreground bg-card px-4 py-3 shadow-[2px_2px_0_var(--ink)]"
                >
                  <div>
                    <p className="font-bold text-foreground">{item.name}</p>
                    {item.translatedName && (
                      <p className="mt-0.5 text-sm text-foreground/60">
                        {item.translatedName}
                      </p>
                    )}
                    <p className="text-xs text-foreground/50">
                      item #{index + 1}
                    </p>
                  </div>
                  <p className="font-mono font-bold text-foreground">
                    {formatCurrency(item.total, currentReceipt.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setCurrentStep("upload")}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep("people")}>
                Looks good — next ✨
              </Button>
            </div>
          </div>
        </section>
      )}

      {showSection("people") && (
        <section className="card-surface space-y-6 p-6">
          <header className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-[var(--candy-mint)] text-foreground shadow-[2px_2px_0_var(--ink)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Add your crew 👯
              </h2>
              <p className="text-sm text-foreground/60">
                Everyone listed gets an itemized share
              </p>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <Label htmlFor="personName" className="text-sm font-medium">
                Person name
              </Label>
              <div className="flex flex-col sm:flex-row gap-3">
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
              <p className="text-xs text-foreground/60">
                Tip: press Enter to add quickly
              </p>
            </div>

            <div className="space-y-2 rounded-xl border-2 border-foreground bg-[#4cd4a9]/15 p-4 text-sm text-foreground/70 shadow-[3px_3px_0_var(--ink)]">
              <p className="mono-label">👥 headcount</p>
              <p>
                <strong className="font-mono text-foreground">{people.length}</strong>{" "}
                {people.length === 1 ? "person" : "people"} added so far.
              </p>
              <p>Each will receive a fair share summary.</p>
            </div>
          </div>

          {people.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {people.map((person) => (
                <span
                  key={person.name}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-foreground px-4 py-1.5 text-sm font-bold text-foreground shadow-[2px_2px_0_var(--ink)]"
                  style={{ backgroundColor: `${person.color}33` }}
                >
                  {person.name}
                  <button
                    className="text-xs opacity-70 hover:opacity-100"
                    onClick={() => handleRemovePerson(person.name)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/60">
              No one added yet. Who&apos;s hungry? 🍽️
            </p>
          )}

          <div className="flex flex-wrap gap-3 justify-between">
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
        <section className="card-surface space-y-6 p-6">
          <header className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-[var(--candy-sky)] text-foreground shadow-[2px_2px_0_var(--ink)]">
              <Images className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Who ate what? 🍜
              </h2>
              <p className="text-sm text-foreground/60">
                Click an item to distribute it. Two people auto-balance to 100%.
              </p>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="mono-label">🍕 items</p>
              {currentReceipt.items.map((item, index) => {
                const unique = Array.from(new Set(item.assignedTo ?? []));
                const totalPercentage = unique.reduce(
                  (sum, name) => sum + (item.percentages?.[name] || 0),
                  0
                );
                return (
                  <button
                    key={`${item.name}-${index}`}
                    onClick={() => setAssignmentModalIndex(index)}
                    className={cn(
                      "w-full rounded-xl border-2 px-4 py-4 text-left transition-all",
                      unique.length
                        ? "border-foreground bg-[#4cd4a9]/20 shadow-[3px_3px_0_var(--ink)]"
                        : "border-foreground/30 bg-card hover:border-foreground hover:shadow-[3px_3px_0_var(--ink)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-foreground">{item.name}</p>
                        {item.translatedName && (
                          <p className="text-xs text-foreground/60">
                            {item.translatedName}
                          </p>
                        )}
                        <p className="text-sm text-foreground/60">
                          {unique.length
                            ? `Assigned to ${unique.join(", ")}`
                            : "Click to assign 👈"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-foreground">
                          {formatCurrency(item.total, currentReceipt.currency)}
                        </p>
                        {unique.length > 0 && (
                          <p className="text-xs font-bold text-[var(--candy-mint)]">
                            {totalPercentage.toFixed(1)}% assigned
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 rounded-xl border-2 border-foreground bg-[#5ab8ff]/15 p-5 shadow-[3px_3px_0_var(--ink)]">
              <p className="mono-label flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                🧮 running totals
              </p>
              {assignmentSummary.length ? (
                assignmentSummary.map((summary) => (
                  <div
                    key={summary.name}
                    className="flex items-center justify-between rounded-xl border-2 border-foreground bg-card p-4 shadow-[2px_2px_0_var(--ink)]"
                  >
                    <div>
                      <p className="font-bold text-foreground">{summary.name}</p>
                      <p className="text-xs text-foreground/60">
                        {summary.count} item{summary.count === 1 ? "" : "s"} assigned
                      </p>
                    </div>
                    <p className="font-mono font-bold text-[var(--candy-pink)]">
                      {formatCurrency(summary.subtotal, currentReceipt.currency)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground/60">
                  Assign at least one item to each person.
                </p>
              )}
              <Button
                onClick={calculateSplit}
                className="w-full"
                disabled={people.length === 0}
              >
                Do the math 🧮
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-between">
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
        <section className="card-surface space-y-6 p-6">
          <header className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-foreground bg-[var(--candy-grape)] text-foreground shadow-[2px_2px_0_var(--ink)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                The damage 💸
              </h2>
              <p className="text-sm text-foreground/60">
                Totals include proportional service charge, tax, and fees.
              </p>
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {results.map((person, personIndex) => (
              <div
                key={person.name}
                className={cn(
                  "card-hover rounded-2xl border-2 border-foreground p-5 shadow-[4px_4px_0_var(--ink)]",
                  PERSON_CARD_TINTS[personIndex % PERSON_CARD_TINTS.length]
                )}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground font-bold text-white shadow-[2px_2px_0_var(--ink)]"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{person.name}</p>
                    <p className="text-sm text-foreground/60">
                      Pays{" "}
                      <span className="font-mono font-bold text-[var(--candy-pink)]">
                        {formatCurrency(person.total, currentReceipt.currency)}
                      </span>
                      {person.totalIdr && (
                        <span className="block font-mono text-xs text-foreground/60">
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
                      className="flex justify-between text-foreground/70"
                    >
                      <span>
                        {item.translatedName ? (
                          <>
                            {item.translatedName}{" "}
                            <span className="text-xs text-foreground/50">
                              ({item.name})
                            </span>
                            {" "}
                            <span className="text-xs text-foreground/50">
                              ({item.percentage.toFixed(1)}%)
                            </span>
                          </>
                        ) : (
                          <>
                            {item.name}{" "}
                            <span className="text-xs text-foreground/50">
                              ({item.percentage.toFixed(1)}%)
                            </span>
                          </>
                        )}
                      </span>
                      <span className="font-mono">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2 border-t-2 border-foreground/20 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Items</span>
                    <span className="font-mono">{formatCurrency(person.subtotal)}</span>
                  </div>
                  {person.serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Service charge</span>
                      <span className="font-mono">{formatCurrency(person.serviceCharge)}</span>
                    </div>
                  )}
                  {person.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Tax</span>
                      <span className="font-mono">{formatCurrency(person.tax)}</span>
                    </div>
                  )}
                  {person.extraCharges.map((charge, index) => (
                    <div className="flex justify-between" key={index}>
                      <span className="text-foreground/60">{charge.name}</span>
                      <span className="font-mono">{formatCurrency(charge.amount)}</span>
                    </div>
                  ))}
                  {person.discount !== 0 && (
                    <div className="flex justify-between font-bold text-[var(--candy-mint)]">
                      <span>Discount 🎁</span>
                      <span className="font-mono">{formatCurrency(person.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-foreground/20 pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span className="font-mono text-[var(--candy-pink)]">{formatCurrency(person.total, currentReceipt.currency)}</span>
                  </div>
                  {person.totalIdr && (
                    <div className="flex justify-between pt-1 text-sm text-foreground/60">
                      <span>In IDR</span>
                      <span className="font-mono">{formatCurrency(person.totalIdr)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-xl border-2 border-foreground bg-[#a78bfa]/15 p-5 shadow-[3px_3px_0_var(--ink)]">
            {/* Unassigned Items Section */}
            {(() => {
              const unassignedItems = currentReceipt.items.filter(
                (item) => !item.assignedTo || item.assignedTo.length === 0
              );

              if (unassignedItems.length === 0) return null;

              const unassignedTotal = unassignedItems.reduce((sum, item) => sum + item.total, 0);

              return (
                <div className="mb-4 rounded-xl border-2 border-dashed border-foreground bg-[#ffc94d]/40 p-4">
                  <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-foreground">
                    🍩 Unassigned items
                  </h3>
                  <div className="space-y-2 text-sm text-foreground/70">
                    {unassignedItems.map((item, index) => (
                      <div key={`unassigned-${index}`} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="font-mono">{formatCurrency(item.total, currentReceipt.currency)}</span>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t-2 border-foreground/30 pt-2 font-bold text-foreground">
                      <span>Unassigned Total</span>
                      <span className="font-mono">{formatCurrency(unassignedTotal, currentReceipt.currency)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="mono-label">🎉 split complete</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  Total paid{" "}
                  <span className="font-mono text-[var(--candy-pink)]">
                    {formatCurrency(
                      results.reduce((sum, person) => sum + person.total, 0)
                    )}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={shareResults}>
                  Share the damage 📤
                </Button>
                <Button onClick={handleStartOver}>Start another receipt</Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {showCropModal && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2735]/50 px-4 backdrop-blur-sm">
          <div className="card-surface w-full max-w-4xl space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Crop receipt ✂️
              </h3>
              <button
                className="text-foreground/50 transition-colors hover:text-foreground"
                onClick={() => setShowCropModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-foreground/60">
              Drag each handle to outline the receipt edges. Everything outside
              the selection is trimmed before OCR.
            </p>
            <div className="mx-auto" style={{ maxWidth: "min(90vw, 900px)" }}>
              <div
                ref={cropAreaRef}
                className="relative inline-block touch-none overflow-hidden rounded-xl border-2 border-foreground bg-secondary"
                style={{ maxHeight: "70vh" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={cropImageRef}
                  src={previewUrl}
                  alt="Receipt crop preview"
                  className="block max-h-[70vh] w-auto max-w-full select-none pointer-events-none"
                  draggable={false}
                  onLoad={handleCropImageLoad}
                />
                {displayPolygonPoints.length === polygonForRendering.length && (
                  <>
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      width={cropAreaSize.width}
                      height={cropAreaSize.height}
                      viewBox={`0 0 ${cropAreaSize.width} ${cropAreaSize.height}`}
                    >
                      <polygon
                        points={displayPolygonPoints
                          .map((point) => `${point.x},${point.y}`)
                          .join(" ")}
                        fill="rgba(255, 111, 165, 0.15)"
                        stroke="#ff6fa5"
                        strokeWidth={2}
                        strokeLinejoin="round"
                      />
                    </svg>
                    {displayPolygonPoints.map((point, index) => (
                      <button
                        key={`handle-${index}`}
                        type="button"
                        onPointerDown={(event) =>
                          handleHandlePointerDown(event, index)
                        }
                        className="absolute w-4 h-4 -mt-2 -ml-2 rounded-full border-2 border-[#ff6fa5] bg-card shadow pointer-events-auto cursor-grab active:cursor-grabbing"
                        style={{
                          left: `${point.x}px`,
                          top: `${point.y}px`,
                        }}
                      >
                        <span className="sr-only">
                          Move crop handle {index + 1}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-xs text-foreground/60">
                {selectionDisplayInfo ? (
                  <>
                    Selection: {selectionDisplayInfo.width} ×{" "}
                    {selectionDisplayInfo.height}px
                    {selectionNaturalInfo && (
                      <span className="text-foreground/40">
                        {" "}
                        ({selectionNaturalInfo.width} ×{" "}
                        {selectionNaturalInfo.height}px source)
                      </span>
                    )}
                  </>
                ) : (
                  "Drag the handles to create a selection"
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={handleResetHandles}>
                  Reset handles
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCropModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyCrop}
                  disabled={!isCropSelectionValid || isCropping}
                >
                  {isCropping ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cropping…
                    </span>
                  ) : (
                    "Apply crop"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2735]/50 px-4 backdrop-blur-sm">
          <div className="card-surface w-full max-w-lg space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Settings className="h-5 w-5 text-[var(--candy-pink)]" />
                AI Configuration 🤖
              </h3>
              <button
                className="text-foreground/50 transition-colors hover:text-foreground"
                onClick={() => setShowConfigModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-foreground/60">
              Keys are stored locally in your browser. Nothing is sent to our
              server — pinky promise.
            </p>
            <div className="space-y-4">
              <div>
                <Label>AI Provider</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(
                    [
                      {
                        id: "azure",
                        label: "Azure OpenAI",
                        description: "Use your Azure endpoint + key",
                      },
                      {
                        id: "gemini",
                        label: "Google Gemini",
                        description: "Use Gemini API key",
                      },
                    ] as { id: KirbyProvider; label: string; description: string }[]
                  ).map((option) => (
                    <Button
                      key={option.id}
                      type="button"
                      variant={
                        configDraft.provider === option.id ? "default" : "outline"
                      }
                      onClick={() =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          provider: option.id,
                        }))
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-foreground/60">
                  Choose Azure for GPT-5-mini or Gemini for Google&apos;s vision-enabled model.
                </p>
              </div>

              {configDraft.provider !== "gemini" && (
                <>
                  <div>
                    <Label htmlFor="endpoint">Azure Endpoint</Label>
                    <Input
                      id="endpoint"
                      placeholder="https://your-resource.openai.azure.com"
                      value={configDraft.endpoint}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          endpoint: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiKey">Azure API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your Azure OpenAI key"
                      value={configDraft.apiKey}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          apiKey: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="apiVersion">API Version</Label>
                      <Input
                        id="apiVersion"
                        value={configDraft.apiVersion}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            apiVersion: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="deployment">Deployment name</Label>
                      <Input
                        id="deployment"
                        value={configDraft.deployment}
                        onChange={(e) =>
                          setConfigDraft((prev) => ({
                            ...prev,
                            deployment: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {configDraft.provider === "gemini" && (
                <>
                  <div>
                    <Label htmlFor="geminiKey">Gemini API Key</Label>
                    <Input
                      id="geminiKey"
                      type="password"
                      placeholder="Enter your Gemini API key"
                      value={configDraft.geminiApiKey}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          geminiApiKey: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="geminiModel">Gemini Model</Label>
                    <select
                      id="geminiModel"
                      className="field-input"
                      value={configDraft.geminiModel}
                      onChange={(e) =>
                        setConfigDraft((prev) => ({
                          ...prev,
                          geminiModel: e.target.value,
                        }))
                      }
                    >
                      {GEMINI_MODELS.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfigModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveConfig}>Save configuration</Button>
            </div>
          </div>
        </div>
      )}

      {assignmentModalIndex !== null &&
        currentReceipt &&
        currentReceipt.items[assignmentModalIndex] && (
          <AssignmentModal
            item={currentReceipt.items[assignmentModalIndex]}
            people={people}
            onClose={() => setAssignmentModalIndex(null)}
            onTogglePerson={(personName) =>
              toggleAssignment(assignmentModalIndex, personName)
            }
            onChangePercentage={(personName, value) =>
              updatePercentage(assignmentModalIndex, personName, value)
            }
          />
        )}

      {loadingState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2735]/50 backdrop-blur-sm">
          <div className="card-surface max-w-sm space-y-3 p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--candy-pink)]" />
            <p className="text-lg font-bold text-foreground">{loadingState.text}</p>
            {loadingState.subtext && (
              <p className="text-xs text-foreground/60">{loadingState.subtext}</p>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2735]/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border-2 border-foreground bg-red-100 p-6 text-center shadow-[5px_5px_0_var(--ink)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-red-700">oops! 😬</p>
            <p className="text-lg font-bold text-foreground">Something went wrong</p>
            <p className="text-sm font-bold text-red-700">{errorMessage}</p>
            <Button onClick={() => setErrorMessage(null)}>Dismiss</Button>
          </div>
        </div>
      )}
    </div>
  );
}

type AssignmentModalProps = {
  item: ReceiptItem;
  people: Person[];
  onClose: () => void;
  onTogglePerson: (name: string) => void;
  onChangePercentage: (name: string, value: number) => void;
};

function AssignmentModal({
  item,
  people,
  onClose,
  onTogglePerson,
  onChangePercentage,
}: AssignmentModalProps) {
  const unique = Array.from(new Set(item.assignedTo ?? []));
  const totalPercentage = unique.reduce(
    (sum, name) => sum + (item.percentages?.[name] || 0),
    0
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2735]/50 px-4 backdrop-blur-sm">
      <div className="card-surface w-full max-w-2xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
            {item.translatedName && (
              <p className="mt-1 text-sm text-foreground/60">
                {item.translatedName}
              </p>
            )}
            <p className="text-sm text-foreground/60">
              <span className="font-mono font-bold text-[var(--candy-pink)]">{formatCurrency(item.total)}</span>
              {" — who's in on this one?"}
            </p>
          </div>
          <button
            className="text-foreground/50 transition-colors hover:text-foreground"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div
          className={cn(
            "rounded-xl border-2 border-foreground p-4 text-sm font-bold text-foreground shadow-[2px_2px_0_var(--ink)]",
            Math.abs(totalPercentage - 100) < 0.1
              ? "bg-[#4cd4a9]/30"
              : "bg-[#ffc94d]/40"
          )}
        >
          Total percentage:{" "}
          <span className="font-mono">{totalPercentage.toFixed(1)}%</span>
          {Math.abs(totalPercentage - 100) < 0.1 ? " 🎯" : " — needs to hit 100%"}
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {people.map((person) => {
            const assigned = unique.includes(person.name);
            const percentage = item.percentages?.[person.name] || 0;
            return (
              <div
                key={person.name}
                className={cn(
                  "space-y-3 rounded-xl border-2 p-4",
                  assigned
                    ? "border-foreground bg-[#4cd4a9]/15 shadow-[2px_2px_0_var(--ink)]"
                    : "border-foreground/30 bg-card"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground font-bold text-white shadow-[2px_2px_0_var(--ink)]"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{person.name}</p>
                      {assigned && (
                        <p className="text-xs text-foreground/60">
                          Share{" "}
                          <span className="font-mono">
                            {formatCurrency(item.total * (percentage / 100))}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={assigned ? "outline" : "default"}
                    onClick={() => onTogglePerson(person.name)}
                  >
                    {assigned ? "Remove" : "Add"}
                  </Button>
                </div>
                {assigned && (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={percentage}
                      onChange={(e) =>
                        onChangePercentage(person.name, Number(e.target.value))
                      }
                      className="w-full accent-[#ff6fa5]"
                    />
                    <div className="flex items-center gap-2 text-sm">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={percentage}
                        onChange={(e) =>
                          onChangePercentage(person.name, Number(e.target.value))
                        }
                        className="w-20 font-mono"
                      />
                      <span className="text-foreground/60">%</span>
                      <span className="ml-auto font-mono font-bold text-[var(--candy-pink)]">
                        {formatCurrency(item.total * (percentage / 100))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
