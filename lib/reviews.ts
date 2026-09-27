"use client";

import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/Firebase";
import { EXPLORE_PAGES, PAGE_COLLECTION, type ExplorePage } from "@/types/listing";

const PAGES = Object.keys(EXPLORE_PAGES) as ExplorePage[];

export interface ReviewDoc {
  id: string; // == the reviewer's uid
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Live list of every review for one listing, newest first.
 *  Pass `listingId: null` (e.g. while a modal is closed) to skip subscribing. */
export function useListingReviews(pageCollection: string, listingId: string | null) {
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, pageCollection, listingId, "reviews"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReviewDoc, "id">) })));
        setLoading(false);
      },
      (err) => {
        console.error("Reviews listen error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [pageCollection, listingId]);

  return { reviews, loading };
}

/** Create or replace the signed-in user's review for a listing. */
export async function submitReview(
  pageCollection: string,
  listingId: string,
  uid: string,
  userName: string,
  rating: number,
  comment: string
): Promise<void> {
  const listingRef = doc(db, pageCollection, listingId);
  const reviewRef = doc(db, pageCollection, listingId, "reviews", uid);

  await runTransaction(db, async (tx) => {
    const [listingSnap, reviewSnap] = await Promise.all([tx.get(listingRef), tx.get(reviewRef)]);

    const prevCount = (listingSnap.data()?.ratingCount as number) ?? 0;
    const prevSum = (listingSnap.data()?.ratingSum as number) ?? 0;
    const hadPrevious = reviewSnap.exists();
    const prevRating = hadPrevious ? ((reviewSnap.data()?.rating as number) ?? 0) : 0;

    const nextCount = hadPrevious ? prevCount : prevCount + 1;
    const nextSum = prevSum - prevRating + rating;
    const nextAvg = nextCount > 0 ? nextSum / nextCount : 0;

    tx.set(
      reviewRef,
      {
        userId: uid,
        userName,
        rating,
        comment: comment.trim(),
        createdAt: hadPrevious ? reviewSnap.data()?.createdAt ?? serverTimestamp() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(
      listingRef,
      { ratingSum: nextSum, ratingCount: nextCount, ratingAvg: nextAvg },
      { merge: true }
    );
  });
}

/** Delete a review — the reviewer removing their own, or an admin moderating
 *  someone else's. Keeps ratingAvg/ratingCount in sync in the same transaction. */
export async function deleteReview(
  pageCollection: string,
  listingId: string,
  reviewUid: string
): Promise<void> {
  const listingRef = doc(db, pageCollection, listingId);
  const reviewRef = doc(db, pageCollection, listingId, "reviews", reviewUid);

  await runTransaction(db, async (tx) => {
    const [listingSnap, reviewSnap] = await Promise.all([tx.get(listingRef), tx.get(reviewRef)]);
    if (!reviewSnap.exists()) return;

    const prevCount = (listingSnap.data()?.ratingCount as number) ?? 0;
    const prevSum = (listingSnap.data()?.ratingSum as number) ?? 0;
    const removedRating = (reviewSnap.data()?.rating as number) ?? 0;

    const nextCount = Math.max(0, prevCount - 1);
    const nextSum = Math.max(0, prevSum - removedRating);
    const nextAvg = nextCount > 0 ? nextSum / nextCount : 0;

    tx.delete(reviewRef);
    tx.set(
      listingRef,
      { ratingSum: nextSum, ratingCount: nextCount, ratingAvg: nextAvg },
      { merge: true }
    );
  });
}

export interface BusinessReviewSummary {
  listingFound: boolean;
  listingId?: string;
  listingName?: string;
  ratingAvg: number;
  ratingCount: number;
}

/** Finds the published Explore listing linked to a business application
 *  (by `businessId`) and streams its reviews + rating summary live. */
export function useBusinessReviews(businessId: string | null) {
  const [reviews, setReviews] = useState<ReviewDoc[]>([]);
  const [summary, setSummary] = useState<BusinessReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setReviews([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubReviews: (() => void) | null = null;
    setLoading(true);

    async function locate() {
      for (const page of PAGES) {
        const snap = await getDocs(
          query(collection(db, PAGE_COLLECTION[page]), where("businessId", "==", businessId), limit(1))
        );
        if (cancelled) return;
        if (!snap.empty) {
          const listingDoc = snap.docs[0];
          const data = listingDoc.data();
          setSummary({
            listingFound: true,
            listingId: listingDoc.id,
            listingName: (data.name as string) ?? "",
            ratingAvg: (data.ratingAvg as number) ?? 0,
            ratingCount: (data.ratingCount as number) ?? 0,
          });
          unsubReviews = onSnapshot(
            query(
              collection(db, PAGE_COLLECTION[page], listingDoc.id, "reviews"),
              orderBy("createdAt", "desc")
            ),
            (rsnap) => {
              if (cancelled) return;
              setReviews(rsnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReviewDoc, "id">) })));
              setLoading(false);
            },
            () => setLoading(false)
          );
          return;
        }
      }
      if (!cancelled) {
        setSummary({ listingFound: false, ratingAvg: 0, ratingCount: 0 });
        setLoading(false);
      }
    }

    locate();
    return () => {
      cancelled = true;
      if (unsubReviews) unsubReviews();
    };
  }, [businessId]);

  return { reviews, summary, loading };
}