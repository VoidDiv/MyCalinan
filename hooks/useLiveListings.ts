/* ============================================================
   FILE: hooks/useLiveListings.ts   (REPLACE whole file)
   Subscribes in real time to the listings of one Explore page
   (food, shopping, healthcare, ...). Everything an admin adds,
   imports, edits or publishes from a business application shows
   up here, ordered the way the admin set it.
   ============================================================ */

"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/Firebase";
import {
  EXPLORE_SOURCES,
  PAGE_COLLECTION,
  type ExplorePage,
  type PublicListing,
} from "@/types/listing";

export type LiveListing = PublicListing & {
  mapsQueryEncoded: string;
  docId: string; // the Firestore document id (id above is prefixed "live-")
  order?: number;
  source?: string;
};

type StoredListing = Omit<PublicListing, "id"> & {
  imageSrc?: string;
  location?: string;
  order?: number;
  source?: string;
};

/** Listings for one Explore page, plus `loading` until the first data arrives. */
export function useExploreListings(page: ExplorePage): {
  listings: LiveListing[];
  loading: boolean;
} {
  const [listings, setListings] = useState<LiveListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Single-field "in" filter -> no composite index needed
    const q = query(
      collection(db, PAGE_COLLECTION[page]),
      where("source", "in", EXPLORE_SOURCES)
    );

    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ docId: d.id, data: d.data() as StoredListing }))
          .filter(({ data }) => data.published !== false)
          .map(({ docId, data }): LiveListing => ({
            ...data,
            id: `live-${docId}`,
            docId,
            image: data.image ?? data.imageSrc ?? "",
            address: data.address ?? data.location ?? "",
            mapsQueryEncoded: encodeURIComponent(data.mapsQuery ?? data.name),
          }));

        // Keep the admin's order; listings without one go last, A–Z
        items.sort((a, b) => {
          const ao = a.order ?? Number.MAX_SAFE_INTEGER;
          const bo = b.order ?? Number.MAX_SAFE_INTEGER;
          return ao - bo || a.name.localeCompare(b.name);
        });

        setListings(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Explore listings (${page}) error:`, err);
        setLoading(false);
      }
    );
  }, [page]);

  return { listings, loading };
}

/** Kept so any page still using the old hook keeps working. */
export function useLiveListings(page: ExplorePage): LiveListing[] {
  return useExploreListings(page).listings;
}