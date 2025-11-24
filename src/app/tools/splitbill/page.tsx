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
    label: "Upload Receipt",
    description: "Drop an image and set your Kirby AI key",
    icon: Upload,
  },
  review: {
    label: "Review Items",
    description: "Check parsed data & totals",
    icon: Receipt,
  },
  people: {
    label: "Add Friends",
    description: "List everyone who shares the bill",
    icon: Users,
  },
  assignment: {
    label: "Assign Items",
    description: "Split dishes with precise percentages",
    icon: Images,
  },
  results: {
    label: "Results",
    description: "Fair share with tax + service",
    icon: Sparkles,
  },
};

const ULTRA_PRESET = {
  label: "Kirby Ultra",
  description: "Maximum context window (16k tokens) for the toughest receipts",
  maxTokens: 16384,
  temperature: 0.01,
};

const RECEIPT_PROMPT = [
  'You are a receipt parsing and reconstruction expert. Azure OCR may break lines, merge words, or misread characters. Clean the OCR text and extract billing data, returning ONLY a minified JSON with this structure:',
  '{"restaurant":"","address":"","date":"","items":[{"name":"","translatedName":"","price":0}],"subtotal":0,"serviceCharge":0,"tax":0,"discount":0,"extraCharges":[{"name":"","amount":0}],"total":0}',
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

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

const formatCurrency = (amount: number) => currencyFormatter.format(amount);

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

  return {
    restaurant: (data?.restaurant ?? "").trim(),
    address: (data?.address ?? "").trim(),
    date: (data?.date ?? "").trim(),
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
      setErrorMessage("Please save your Kirby AI configuration first.");
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
        let errorMessage = `Kirby AI error: ${response.status}`;

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
        throw new Error("Kirby AI response did not include parsed content.");
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
        subtext: "Processing image for Kirby Vision",
      });

      // Use optimized image processing for OCR
      const imageBase64 = await processImageForOCR(selectedFile);

      setLoadingState({
        text: "Analyzing receipt...",
        subtext: "Consulting Kirby Vision",
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
        method: `Kirby Vision · ${ULTRA_PRESET.label}`,
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

    const unassigned = currentReceipt.items.filter(
      (item) => !item.assignedTo || item.assignedTo.length === 0
    );

    if (unassigned.length) {
      setErrorMessage(
        `Some items are unassigned (${unassigned.length}). Assign everyone before calculating.`
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

    setResults(peopleShares);
    setCurrentStep("results");
  };

  const buildResultsSummary = (peopleShares: PersonShare[]) => {
    const lines = [
      "SplitBill Results",
      "",
      ...peopleShares.flatMap((person) => [
        `${person.name} - ${formatCurrency(person.total)}`,
        ...person.items.map((item) => {
          const displayName = item.translatedName 
            ? `${item.translatedName} (${item.name})`
            : item.name;
          return `  • ${displayName} (${item.percentage.toFixed(1)}%) -> ${formatCurrency(
            item.price
          )}`;
        }),
        `  Service Charge: ${formatCurrency(person.serviceCharge)}`,
        `  Tax: ${formatCurrency(person.tax)}`,
        ...person.extraCharges.map(
          (charge) => `  ${charge.name}: ${formatCurrency(charge.amount)}`
        ),
        ...(person.discount !== 0
          ? [`  Discount: ${formatCurrency(person.discount)}`]
          : []),
        "",
      ]),
      `Grand Total: ${formatCurrency(
        peopleShares.reduce((sum, person) => sum + person.total, 0)
      )}`,
    ];
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
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="text-center space-y-3">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm uppercase tracking-[0.3em] text-pink-500 font-semibold"
        >
          SplitBill AI
        </motion.p>
        <motion.h1
          className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Kirby-fied Receipt Splitter
        </motion.h1>
        <p className="text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Upload a restaurant receipt, let Kirby AI read it, and share the bill
          with friends—complete with taxes, service charges, and pastel glitter
          vibes.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowConfigModal(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Kirby AI Settings
          </Button>
          <Button
            variant="ghost"
            onClick={handleCopyShareableConfig}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share Kirby config
          </Button>
        </div>
        {configLoadedFromUrl && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            Config loaded from URL
          </div>
        )}
        {shareNotice && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
            <Share2 className="h-4 w-4" />
            {shareNotice}
          </div>
        )}
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kirby Ultra handles every receipt with 16,384 tokens of context so you
            never need to manage tiers.
          </p>
          {tokenUsage && (
            <p className="text-xs text-gray-400">
              Last OCR run via{" "}
              {tokenUsage.provider === "azure" ? "Azure OpenAI" : "Google Gemini"}{" "}
              used {describeTokenUsage(tokenUsage) || "an unknown number of tokens"}.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
        {STEP_ORDER.map((step, index) => {
          const Icon = STEP_META[step].icon;
          const active = currentStep === step;
          const completed = index < stepIndex;
          const clickable = canNavigateToStep(step);
          return (
            <button
              key={step}
              type="button"
              onClick={() => clickable && handleStepClick(step)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl border-2 shadow-md transition-all w-full sm:w-auto",
                active
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-400"
                  : completed
                  ? "bg-white dark:bg-gray-900 border-pink-300 text-pink-600"
                  : "bg-white/70 border-gray-200 text-gray-500",
                clickable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              )}
            >
              <Icon className="h-5 w-5" />
              <div className="text-left">
                <p className="text-sm font-semibold">{STEP_META[step].label}</p>
                <p className="text-xs opacity-80">
                  {STEP_META[step].description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {showSection("upload") && (
        <section
          className={cn(
            "bg-white/95 dark:bg-gray-900/95 rounded-3xl border-2 border-pink-200 shadow-2xl p-6 space-y-6 backdrop-blur-sm",
            currentStep === "upload" ? "ring-4 ring-pink-200" : ""
          )}
        >
          <header className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-pink-100 text-pink-600">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                  Step 1 · Upload Receipt
                </h2>
                <p className="text-sm text-gray-500">
                  Drag & drop an image or tap to browse
                </p>
              </div>
            </div>
          </header>

          <div
            className={cn(
              "border-[3px] border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-pink-50 hover:from-pink-50 hover:to-white",
              selectedFile ? "border-pink-400" : "border-pink-200"
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
                    className="rounded-2xl shadow-lg object-contain border-2 border-white bg-white"
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
              <p className="text-xs text-gray-400 text-center w-full">
                {hasCroppedImage
                  ? "Cropped version in use. You can re-open Crop to adjust."
                  : "Tip: Tap Crop to outline the receipt and remove background clutter for better OCR."}
              </p>
            </div>
            ) : (
              <div className="space-y-3">
                <FileImage className="w-16 h-16 text-pink-200 mx-auto" />
                <p className="text-xl font-semibold">Drop your receipt here</p>
                <p className="text-gray-500">
                  Supports JPG, PNG, HEIC. We never upload files to our server.
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
        <section
          className={cn(
            "bg-white/95 dark:bg-gray-900/95 rounded-3xl border-2 border-purple-200 shadow-2xl p-6 space-y-6 backdrop-blur-sm",
            currentStep === "review" ? "ring-4 ring-purple-200" : ""
          )}
        >
          <header className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Step 2 · Review Results</h2>
              <p className="text-sm text-gray-500">
                Confirm the parsed merchant info and totals
              </p>
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border-2 border-purple-100 bg-gradient-to-br from-white to-purple-50 p-5 space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Receipt Info
              </h3>
              <p className="font-bold text-xl">
                {currentReceipt.restaurant || "Restaurant name not detected"}
              </p>
              <p className="text-sm text-gray-500">
                {currentReceipt.address || "Address not detected"}
              </p>
              <p className="text-sm text-gray-500">
                {currentReceipt.date || "Date not detected"}
              </p>
              {ocrMeta && (
                <p className="text-xs text-gray-400">
                  Parsed via {ocrMeta.method}
                </p>
              )}
            </div>

            <div className="rounded-3xl border-2 border-purple-100 bg-white p-5 space-y-3">
              <h3 className="text-lg font-semibold">Bill summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Items total</span>
                  <span>{formatCurrency(currentReceipt.subtotal)}</span>
                </div>
                {currentReceipt.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Service charge</span>
                    <span>{formatCurrency(currentReceipt.serviceCharge)}</span>
                  </div>
                )}
                {currentReceipt.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{formatCurrency(currentReceipt.tax)}</span>
                  </div>
                )}
                {currentReceipt.extraCharges.map((charge) => (
                  <div className="flex justify-between" key={charge.name}>
                    <span>{charge.name}</span>
                    <span>{formatCurrency(charge.amount)}</span>
                  </div>
                ))}
                {currentReceipt.discount !== 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>{formatCurrency(currentReceipt.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-3 border-t border-purple-100 mt-2">
                  <span>Total</span>
                  <span>{formatCurrency(currentReceipt.total)}</span>
                </div>
                {!currentReceipt.isValid && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Totals don&apos;t add up perfectly. Double-check numbers.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-purple-100 bg-white p-5">
            <h3 className="text-lg font-semibold mb-4">Extracted items</h3>
            <div className="space-y-3">
              {currentReceipt.items.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-purple-100 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    {item.translatedName && (
                      <p className="text-sm text-purple-600 mt-0.5">
                        🌐 {item.translatedName}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">Item #{index + 1}</p>
                  </div>
                  <p className="font-semibold text-purple-600">
                    {formatCurrency(item.total)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setCurrentStep("upload")}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep("people")}>
                Looks good · Next
              </Button>
            </div>
          </div>
        </section>
      )}

      {showSection("people") && (
        <section
          className={cn(
            "bg-white/95 dark:bg-gray-900/95 rounded-3xl border-2 border-blue-200 shadow-2xl p-6 space-y-6 backdrop-blur-sm",
            currentStep === "people" ? "ring-4 ring-blue-200" : ""
          )}
        >
          <header className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Step 3 · Add people</h2>
              <p className="text-sm text-gray-500">
                Everyone here will get a pastel-colored share card ✨
              </p>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <Label htmlFor="personName" className="font-semibold text-sm">
                Person name
              </Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  id="personName"
                  placeholder="Add Alice, Bob, Kirby..."
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
              <p className="text-xs text-gray-400">
                Tip: Press Enter to add quickly
              </p>
            </div>

            <div className="rounded-3xl border-2 border-blue-100 bg-blue-50/80 p-4 space-y-2 text-sm text-blue-900">
              <p className="font-semibold text-blue-600">
                💡 Headcount preview
              </p>
              <p>
                You&apos;ve added <strong>{people.length}</strong>{" "}
                {people.length === 1 ? "friend" : "friends"} so far.
              </p>
              <p>Each will receive a fair share summary.</p>
            </div>
          </div>

          {people.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {people.map((person) => (
                <span
                  key={person.name}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow"
                  style={{ backgroundColor: `${person.color}20`, color: person.color }}
                >
                  {person.name}
                  <button
                    className="text-xs"
                    onClick={() => handleRemovePerson(person.name)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No one added yet. Kirby eats alone? 😢
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
        <section
          className={cn(
            "bg-white/95 dark:bg-gray-900/95 rounded-3xl border-2 border-amber-200 shadow-2xl p-6 space-y-6 backdrop-blur-sm",
            currentStep === "assignment" ? "ring-4 ring-amber-200" : ""
          )}
        >
          <header className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-600">
              <Images className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Step 4 · Assign items</h2>
              <p className="text-sm text-gray-500">
                Tap an item to distribute it. Two people auto-balance to 100%.
              </p>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Items</h3>
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
                      "w-full text-left rounded-3xl border px-4 py-4 transition-all",
                      unique.length
                        ? "border-amber-200 bg-amber-50"
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        {item.translatedName && (
                          <p className="text-xs text-amber-600">
                            🌐 {item.translatedName}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          {unique.length
                            ? `Assigned to ${unique.join(", ")}`
                            : "Tap to assign"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(item.total)}
                        </p>
                        {unique.length > 0 && (
                          <p className="text-xs text-gray-500">
                            {totalPercentage.toFixed(1)}% assigned
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-3xl border-2 border-amber-100 bg-amber-50/70 p-5 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" />
                Assignment summary
              </h3>
              {assignmentSummary.length ? (
                assignmentSummary.map((summary) => (
                  <div
                    key={summary.name}
                    className="rounded-2xl bg-white/80 p-4 shadow flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold">{summary.name}</p>
                      <p className="text-xs text-gray-500">
                        {summary.count} item{summary.count === 1 ? "" : "s"} assigned
                      </p>
                    </div>
                    <p className="font-semibold text-amber-600">
                      {formatCurrency(summary.subtotal)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-amber-800">
                  Assign at least one item to each friend.
                </p>
              )}
              <Button
                onClick={calculateSplit}
                className="w-full"
                disabled={
                  !currentReceipt.items.every(
                    (item) => item.assignedTo && item.assignedTo.length > 0
                  )
                }
              >
                Calculate fair split
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
        <section
          className={cn(
            "bg-white/95 dark:bg-gray-900/95 rounded-3xl border-2 border-green-200 shadow-2xl p-6 space-y-6 backdrop-blur-sm",
            currentStep === "results" ? "ring-4 ring-green-200" : ""
          )}
        >
          <header className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-green-100 text-green-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Step 5 · Results</h2>
              <p className="text-sm text-gray-500">
                Totals include proportional service charge, tax, and fees.
              </p>
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {results.map((person) => (
              <div
                key={person.name}
                className="rounded-3xl border-2 border-green-100 bg-gradient-to-br from-white to-green-50 p-5 shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{person.name}</p>
                    <p className="text-sm text-gray-500">
                      Pays {formatCurrency(person.total)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {person.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex justify-between text-gray-600"
                    >
                      <span>
                        {item.translatedName ? (
                          <>
                            {item.translatedName}{" "}
                            <span className="text-xs text-gray-400">
                              ({item.name})
                            </span>
                            {" "}
                            <span className="text-xs text-gray-400">
                              ({item.percentage.toFixed(1)}%)
                            </span>
                          </>
                        ) : (
                          <>
                            {item.name}{" "}
                            <span className="text-xs text-gray-400">
                              ({item.percentage.toFixed(1)}%)
                            </span>
                          </>
                        )}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-green-100 mt-4 pt-4 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span>{formatCurrency(person.subtotal)}</span>
                  </div>
                  {person.serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Service charge</span>
                      <span>{formatCurrency(person.serviceCharge)}</span>
                    </div>
                  )}
                  {person.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(person.tax)}</span>
                    </div>
                  )}
                  {person.extraCharges.map((charge, index) => (
                    <div className="flex justify-between" key={index}>
                      <span>{charge.name}</span>
                      <span>{formatCurrency(charge.amount)}</span>
                    </div>
                  ))}
                  {person.discount !== 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>{formatCurrency(person.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-green-100">
                    <span>Total</span>
                    <span>{formatCurrency(person.total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border-2 border-green-100 bg-white p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">All done!</p>
              <p className="text-2xl font-black">
                Total paid ·{" "}
                {formatCurrency(
                  results.reduce((sum, person) => sum + person.total, 0)
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={shareResults}>
                Share bill
              </Button>
              <Button onClick={handleStartOver}>Start another receipt</Button>
            </div>
          </div>
        </section>
      )}

      {showCropModal && previewUrl && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl p-6 space-y-4 border-2 border-pink-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                ✂️ Crop receipt
              </h3>
              <button onClick={() => setShowCropModal(false)}>✕</button>
            </div>
            <p className="text-sm text-gray-500">
              Drag each handle to outline the receipt edges. Kirby will trim
              everything outside of your pink polygon.
            </p>
            <div className="mx-auto" style={{ maxWidth: "min(90vw, 900px)" }}>
              <div
                ref={cropAreaRef}
                className="relative inline-block overflow-hidden rounded-2xl bg-gray-100 shadow-inner touch-none"
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
                        fill="rgba(236, 72, 153, 0.2)"
                        stroke="#ec4899"
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
                        className="absolute w-4 h-4 -mt-2 -ml-2 rounded-full border-2 border-pink-500 bg-white shadow pointer-events-auto cursor-grab active:cursor-grabbing"
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
              <div className="text-xs text-gray-500">
                {selectionDisplayInfo ? (
                  <>
                    Selection: {selectionDisplayInfo.width} ×{" "}
                    {selectionDisplayInfo.height}px
                    {selectionNaturalInfo && (
                      <span className="text-gray-400">
                        {" "}
                        ({selectionNaturalInfo.width} ×{" "}
                        {selectionNaturalInfo.height}px source)
                      </span>
                    )}
                  </>
                ) : (
                  "Drag the pink handles to create a selection"
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-6 border-2 border-pink-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Kirby AI Configuration
              </h3>
              <button onClick={() => setShowConfigModal(false)}>✕</button>
            </div>
            <p className="text-sm text-gray-500">
              Keys are stored locally in your browser. Nothing is sent to our
              server.
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
                <p className="text-xs text-gray-500 mt-2">
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
                      className="w-full p-3 rounded-full border-2 border-pink-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 border-4 border-pink-200 shadow-2xl text-center space-y-3 max-w-sm">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500 mx-auto" />
            <p className="text-xl font-black">{loadingState.text}</p>
            {loadingState.subtext && (
              <p className="text-sm text-gray-500">{loadingState.subtext}</p>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 border-2 border-red-200 space-y-4 shadow-2xl text-center">
            <p className="text-3xl">😅</p>
            <p className="text-lg font-semibold">Oops!</p>
            <p className="text-sm text-gray-500">{errorMessage}</p>
            <Button onClick={() => setErrorMessage(null)}>Got it</Button>
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl p-6 border-2 border-amber-200 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{item.name}</h3>
            {item.translatedName && (
              <p className="text-sm text-amber-600 mt-1">
                🌐 {item.translatedName}
              </p>
            )}
            <p className="text-sm text-gray-500">
              {formatCurrency(item.total)} · Assign people & percentages
            </p>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        <div
          className={cn(
            "rounded-2xl p-4 border",
            Math.abs(totalPercentage - 100) < 0.1
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          )}
        >
          Total percentage: {totalPercentage.toFixed(1)}%
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {people.map((person) => {
            const assigned = unique.includes(person.name);
            const percentage = item.percentages?.[person.name] || 0;
            return (
              <div
                key={person.name}
                className={cn(
                  "rounded-2xl border p-4 space-y-3",
                  assigned ? "border-amber-200 bg-amber-50" : "border-gray-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{person.name}</p>
                      {assigned && (
                        <p className="text-xs text-gray-500">
                          Share {formatCurrency(item.total * (percentage / 100))}
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
                      className="w-full accent-amber-500"
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
                        className="w-20"
                      />
                      <span>%</span>
                      <span className="ml-auto font-semibold">
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
