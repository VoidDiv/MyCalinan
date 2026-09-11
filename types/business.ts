/* ============================================================
   FILE: types/business.ts
   PURPOSE: Shared types + constants for the Business
   Registration system (public form + admin review dashboard).
   ============================================================ */

import type { Timestamp } from "firebase/firestore";

/* ── Review status of a single document ── */
export type DocStatus = "pending" | "approved" | "rejected";

/* ── A single uploaded document with its own review status ── */
export interface DocumentEntry {
  name: string;
  url: string;
  status: DocStatus;
  rejectionReason: string | null;
}

/* ── Business pictures: up to 5 photos sharing one status ── */
export interface PicturesEntry {
  urls: { name: string; url: string }[];
  status: DocStatus;
  rejectionReason: string | null;
}

/* ── The full Firestore document shape for a business
   registration, stored in the "businesses" collection. ── */
export interface BusinessRegistration {
  id?: string;

  ownerId: string;
  ownerEmail: string;

  fullName: string;
  phoneNumber: string;

  businessName: string;
  businessType: string;
  yearOperation: string;

  documents: {
    businessPermit: DocumentEntry;
    dti: DocumentEntry;
    barangayClearance: DocumentEntry;
    barangayCertification: DocumentEntry;
    cedula: DocumentEntry;
    businessPictures: PicturesEntry;
  };

  /** Computed: "approved" if all approved, "rejected" if any rejected,
   *  otherwise "pending". */
  overallStatus: DocStatus;

  submittedAt: Timestamp;
  updatedAt?: Timestamp;
}

/* ── Business type options shown in the registration form's
   dropdown. ── */
export const BUSINESS_TYPES: string[] = [
  "Sari-Sari Store",
  "Restaurant / Eatery",
  "Retail Store",
  "Grocery / Market Stall",
  "Pharmacy",
  "Hardware Store",
  "Salon / Barbershop",
  "Repair Shop",
  "Agriculture / Farm Supply",
  "Services (Freelance / Professional)",
  "Other",
];

/* ── The current year, used to cap the "Year of Operation"
   field so applicants can't enter a future year. ── */
export const CURRENT_YEAR: number = new Date().getFullYear();

/** Maximum number of business pictures allowed per submission. */
export const MAX_BUSINESS_PICTURES = 5;