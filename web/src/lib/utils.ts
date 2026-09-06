import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

const ENUM_SQ: Record<string, string> = {
  // Statuset e dosjes
  ACTIVE: "Aktive", SUSPENDED: "Pezulluar", CLOSED: "Mbyllur", WRITTEN_OFF: "E Çregjistruar", INACTIVE: "Joaktive",
  // Fazat e arkëtimit
  D1: "D1", D2: "D2", D3: "D3", D4: "D4", LEGAL: "Juridike",
  // Llojet e aktivitetit
  CALL: "Telefonatë", SMS: "SMS", EMAIL: "Email",
  FIELD_VISIT: "Vizitë në Terren", PROMISE_TO_PAY: "Premtim Pagese",
  PAYMENT_RECEIVED: "Pagesë e Marrë", DISPUTE: "Ankesë", OTHER: "Tjetër",
  // Rezultatet e aktivitetit
  KEPT: "E Mbajtur", BROKEN: "E Thyer", PARTIAL: "Pjesërisht",
  PENDING: "Në Pritje", NO_ANSWER: "Pa Përgjigje", DECLINED: "E Refuzuar", AGREED: "E Dakorduar",
  // Statusi ligjor
  JUDGMENT_OBTAINED: "Vendim i Marrë", ENFORCEMENT: "Ekzekutim", APPEALED: "E Ankimuar",
  IN_PROGRESS: "Në Progres", INITIATED: "Iniciuar", JUDGMENT: "Vendim",
  // Statusi i marrëveshjes
  COMPLETED: "E Përfunduar", DEFAULTED: "E Dështuar", CANCELLED: "E Anuluar",
  // Statusi i këstit
  PAID: "Paguar", OVERDUE: "Me Vonesë", PARTIAL_PAID: "Pjesërisht Paguar",
  // Metodat e pagesës
  CASH: "Kesh", BANK_TRANSFER: "Transfer Bankar", CARD: "Kartë", CHECK: "Çek", ONLINE: "Online",
  // Kanalet e pagesës
  BRANCH: "Degë", ATM: "ATM", MOBILE_APP: "Aplikacion Mobil", AGENT: "Agjent",
  // Llojet e telefonit
  MOBILE: "Celular", WORK: "Pune", HOME: "Shtëpie",
  // Rolet e përdoruesit
  ADMIN: "Administrator", MANAGER: "Menaxher", OFFICER: "Oficer", VIEWER: "Vëzhgues",
  // Klasifikimi NPL
  SUBSTANDARD: "Nënstandard", DOUBTFUL: "I Dyshimtë", LOSS: "Humbje",
  // Lloji i produktit
  PERSONAL: "Personal", MORTGAGE: "Hipotekë", BUSINESS: "Biznesi", AUTO: "Auto", CONSUMER: "Konsumator",
  // Rolet e palëve të lidhura
  GUARANTOR: "Garant", CO_BORROWER: "Bashkëhuamarrës",
};

/** Konverton vlerat enum të bazës së të dhënave në shqip. */
export function formatEnum(val: string | null | undefined): string {
  if (!val) return "—";
  return ENUM_SQ[val] ?? val.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
