export type CropPoint = { u: number; v: number };

export type OpenAiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type TokenUsage = {
  provider: "openai";
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
};

export type ExtraCharge = { name: string; amount: number };

export type ReceiptItem = {
  name: string;
  translatedName?: string;
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

export type Person = { name: string; color: string };

export type PersonShare = {
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

export type Step = "setup" | "assign" | "results";
