import "server-only";

export type PublicSiteConfig = {
  serviceName: string;
  legalName: string;
  businessId: string;
  vatId: string;
  address: string;
  postalAddress: string;
  country: string;
  email: string;
  phone: string;
  privacyEmail: string;
  court: string;
  location: string;
  vatRegistered: boolean;
  vatRate: number;
  legalReady: boolean;
};

function text(name: string, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function numberValue(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export function getPublicSiteConfig(): PublicSiteConfig {
  const serviceName = text("NEXT_PUBLIC_SERVICE_NAME", "Raccoon North");
  const legalName = text("LEGAL_BUSINESS_NAME");
  const businessId = text("LEGAL_BUSINESS_ID");
  const address = text("LEGAL_STREET_ADDRESS");
  const postalAddress = text("LEGAL_POSTAL_ADDRESS");
  const email = text("NEXT_PUBLIC_SERVICE_EMAIL", text("PUBLIC_CONTACT_TO_EMAIL"));
  const privacyEmail = text("PRIVACY_CONTACT_EMAIL", email);
  const vatRegistered = text("NEXT_PUBLIC_VAT_REGISTERED", "false").toLowerCase() === "true";
  const vatRate = numberValue("NEXT_PUBLIC_VAT_RATE", 25.5);
  return {
    serviceName,
    legalName,
    businessId,
    vatId: text("LEGAL_VAT_ID"),
    address,
    postalAddress,
    country: text("LEGAL_COUNTRY", "Finland"),
    email,
    phone: text("NEXT_PUBLIC_SERVICE_PHONE"),
    privacyEmail,
    court: text("LEGAL_DISPUTE_COURT", "the competent district court stated in the project agreement"),
    location: text("NEXT_PUBLIC_SERVICE_LOCATION", "Finland"),
    vatRegistered,
    vatRate,
    legalReady: Boolean(legalName && businessId && address && postalAddress && email),
  };
}
