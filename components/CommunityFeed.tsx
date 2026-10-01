"use client";

import { useEffect, useState } from "react";
import WovenDivider from "./WovenDivider";
import { useCachedJson } from "@/hooks/useCachedJson";

type FeedItem = {
  _id?: string;
  title: string;
  description: string;
  date: string;
  category?: string;
  image?: string; // photo URL added by the admin
};

function useFeed(endpoint: string) {
  const { data, loading, error, stale } = useCachedJson<FeedItem[]>(endpoint);
  const items = Array.isArray(data) ? data : [];
  return { items, loading, error, stale };
}

function FeedCard({
  item,
  onOpenImage,
}: {
  item: FeedItem;
  onOpenImage: (src: string, alt: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!item.image && !imageFailed;

  return (
    <article className="overflow-hidden rounded-[var(--radius-stall)] border border-canopy-600/25 bg-white shadow-sm">
      {showImage && (
        <button
          type="button"
          onClick={() => onOpenImage(item.image as string, item.title)}
          className="block w-full cursor-zoom-in"
          aria-label={`View photo: ${item.title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="aspect-video w-full object-cover"
          />
        </button>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          {item.category && (
            <span className="rounded-full bg-canopy-100 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-canopy-800">
              {item.category}
            </span>
          )}
          <span className="font-mono text-xs text-ink-500">{item.date}</span>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold text-canopy-900 sm:mt-3">
          {item.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          {item.description}
        </p>
      </div>
    </article>
  );
}

function FeedList({
  heading,
  endpoint,
  noun,
  idPrefix,
  headingClass,
  onOpenImage,
}: {
  heading: string;
  endpoint: string;
  noun: string; // "announcements" | "events"
  idPrefix: string;
  headingClass: string;
  onOpenImage: (src: string, alt: string) => void;
}) {
  const { items, loading, error, stale } = useFeed(endpoint);

  return (
    <>
      <h2 className={headingClass}>{heading}</h2>
      <WovenDivider tone="cream" />

      {loading && (
        <p className="mt-5 font-mono text-sm text-ink-500 sm:mt-8">Loading {noun}...</p>
      )}

      {!loading && error && (
        <p className="mt-5 font-mono text-sm text-ink-500 sm:mt-8">
          Unable to load {noun} right now.
        </p>
      )}

      {!loading && !error && stale && (
        <p className="mt-5 font-mono text-xs text-ink-500 sm:mt-8">
          You&rsquo;re offline — showing the last saved {noun}.
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="mt-5 font-mono text-sm text-ink-500 sm:mt-8">No {noun} yet.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-5 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5">
          {items.map((item, index) => (
            <FeedCard
              key={item._id || `${idPrefix}-${index}`}
              item={item}
              onOpenImage={onOpenImage}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function CommunityFeed() {
  // Photo being viewed full-size (uses the site's .lightbox-* styles from globals.css)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const openImage = (src: string, alt: string) => setLightbox({ src, alt });

  return (
    <section className="bg-canopy-100 px-6 py-8 sm:px-10 sm:py-12 lg:px-20 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <FeedList
          heading="Community announcements"
          endpoint="/api/announcements"
          noun="announcements"
          idPrefix="announcement"
          headingClass="font-display text-2xl font-semibold text-canopy-800 sm:text-3xl lg:text-4xl"
          onOpenImage={openImage}
        />

        <FeedList
          heading="Community events"
          endpoint="/api/events"
          noun="events"
          idPrefix="event"
          headingClass="mt-10 font-display text-2xl font-semibold text-canopy-800 sm:mt-14 sm:text-3xl lg:text-4xl"
          onOpenImage={openImage}
        />
      </div>

      {lightbox && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="lightbox-close"
            aria-label="Close"
            onClick={() => setLightbox(null)}
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}