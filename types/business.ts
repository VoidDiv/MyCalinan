/* ============================================================
   FILE: types/business.ts   (REPLACE whole file)
   PURPOSE: Shared types + constants for the Business
   Registration system (public form + admin review dashboard).
   ============================================================ */

import type { Timestamp } from "firebase/firestore";
import { REGISTRATION_GROUPS, type ExplorePage } from "./listing";

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
  /** Display label of what the owner picked (the category, e.g. "Bakeshop").
   *  Older applications may hold the previous free-form types. */
  businessType: string;
  /** Explore page + category the owner picked. Used to pre-fill the admin's
   *  Approve & Publish form. Missing on applications made before this change. */
  explorePage?: ExplorePage;
  exploreCategory?: string;
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

/* ── Flat list of every type an owner can register as.
   Kept so any file still importing BUSINESS_TYPES keeps working;
   the registration form itself now uses REGISTRATION_GROUPS
   (see types/listing.ts) so choices always match Explore. ── */
export const BUSINESS_TYPES: string[] = REGISTRATION_GROUPS.flatMap((g) => g.categories);

/* ── The current year, used to cap the "Year of Operation"
   field so applicants can't enter a future year. ── */
export const CURRENT_YEAR: number = new Date().getFullYear();

/** Maximum number of business pictures allowed per submission. */
export const MAX_BUSINESS_PICTURES = 5;