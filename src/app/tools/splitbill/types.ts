export type CropPoint = {
  u: number;
  v: number;
};

export type KirbyQualityMode = "economy" | "balanced" | "precision" | "ultra";

export type KirbyProvider = "azure" | "gemini";

export type KirbyAiConfig = {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployment: string;
  provider: KirbyProvider;
  geminiApiKey: string;
  geminiModel: string;
  qualityMode: KirbyQualityMode;
};

export type ExtraCharge = {
  name: string;
  amount: number;
};

export type ReceiptItem = {
  name: string;
  quantity: number;
  price: number;
  total: number;
  assignedTo: string[];
  percentages: Record<string, number>;
};

export type ReceiptData = {
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

export type Person = {
  name: string;
  color: string;
};

export type PersonShare = {
  name: string;
  color: string;
  items: {
    name: string;
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

export type Step = "upload" | "review" | "people" | "assignment" | "results";

