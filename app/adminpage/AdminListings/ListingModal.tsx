/* ============================================================
   FILE: app/adminpage/AdminListings/ListingModal.tsx   (NEW)
   One editor for every Explore listing. Used to:
   - approve & publish a business application,
   - edit any listing already on Explore (built-in or not),
   - add a brand-new establishment without an application.
   ============================================================ */

"use client";

import { useState } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/Firebase";
import {
  EXPLORE_PAGES,
  pinFor,
  type ExplorePage,
  type ListingData,
} from "@/types/listing";
import { styles } from "./styles";

export interface ListingModalProps {
  title: string;
  submitLabel: string;
  /** Values to pre-fill (an existing listing, or defaults for a new one). */
  initial?: Partial<ListingData>;
  /** Small green hint shown under the title. */
  notice?: string;
  /** Photos from a business application the admin can pick from. */
  photoChoices?: string[];
  onClose: () => void;
  onSave: (data: ListingData) => Promise<void>;
}

export default function ListingModal({
  title,
  submitLabel,
  initial,
  notice,
  photoChoices = [],
  onClose,
  onSave,
}: ListingModalProps) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    page: (initial?.page ?? "food") as ExplorePage,
    category: initial?.category ?? "",
    tags: initial?.tags ?? ([] as string[]),
    tag: initial?.tag ?? "",
    pin: initial?.pin ?? "",
    description: initial?.description ?? "",
    address: initial?.address ?? "",
    image: initial?.image ?? "",
    lat: initial?.lat != null ? String(initial.lat) : "",
    lng: initial?.lng != null ? String(initial.lng) : "",
    published: initial?.published ?? true,
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const cfg = EXPLORE_PAGES[f.page];
  const isEducation = f.page === "education";

  // Keep an unusual existing category selectable instead of silently blanking it
  const categoryOptions =
    !f.category || cfg.categories.includes(f.category)
      ? cfg.categories
      : [...cfg.categories, f.category];

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  function toggleTag(t: string) {
    setF((p) => ({
      ...p,
      tags: p.tags.includes(t) ? p.tags.filter((x) => x !== t) : [...p.tags, t],
    }));
  }

  async function geocode() {
    setErr("");
    try {
      const q = encodeURIComponent(`${f.name} ${f.address} Calinan Davao City`);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?proximity=125.454,7.188&country=PH&limit=1&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      const data = await res.json();
      const c = data.features?.[0]?.center;
      if (!c) {
        setErr("No match found. Enter the coordinates manually (right-click the spot in Google Maps to copy them).");
        return;
      }
      setF((p) => ({ ...p, lng: String(c[0]), lat: String(c[1]) }));
    } catch {
      setErr("Geocoding failed. Enter the coordinates manually.");
    }
  }

  async function upload(file: File) {
    setErr("");
    setUploading(true);
    try {
      const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const fileRef = storageRef(storage, `explore/${f.page}/${safeName}`);
      await uploadBytes(fileRef, file);
      set("image", await getDownloadURL(fileRef));
    } catch (e) {
      console.error(e);
      setErr("Upload failed. Storage may not allow admin uploads yet — paste an image link instead.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    const lat = parseFloat(f.lat);
    const lng = parseFloat(f.lng);
    const category = isEducation ? f.tags[0] : f.category;

    if (!f.name.trim()) return setErr("Name is required.");
    if (!category) return setErr(isEducation ? "Select at least one school type." : "Choose a category.");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return setErr("Valid latitude and longitude are required.");
    }
    if (!f.image.trim()) return setErr("Add a photo — upload one or paste an image link.");

    // Keep the original Google Maps search text unless the name/address changed
    const unchanged =
      initial?.mapsQuery &&
      initial.name === f.name.trim() &&
      (initial.address ?? "") === f.address.trim();
    const mapsQuery = unchanged
      ? (initial?.mapsQuery as string)
      : `${f.name.trim()} ${f.address.trim()} Calinan Davao City`.replace(/\s+/g, " ").trim();

    setErr("");
    setBusy(true);
    try {
      await onSave({
        name: f.name.trim(),
        page: f.page,
        category,
        tags: isEducation ? f.tags : [category],
        tag: f.tag.trim() || (isEducation ? f.tags.join(" & ") : category),
        pin: f.pin.trim() || pinFor(f.page, category),
        description: f.description.trim(),
        address: f.address.trim(),
        image: f.image.trim(),
        lat,
        lng,
        mapsQuery,
        published: f.published,
      });
    } catch (e) {
      console.error(e);
      setErr("Could not save. Check your Firestore rules and that you are signed in as admin.");
      setBusy(false);
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...styles.modalBox, maxWidth: 580, textAlign: "left", maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={styles.modalTitle}>{title}</h3>
        {notice && <div style={styles.requestNote}>{notice}</div>}
        {err && <div style={styles.rejectionNote}>{err}</div>}

        <label style={styles.fLabel}>Name</label>
        <input style={styles.fInput} value={f.name} onChange={(e) => set("name", e.target.value)} />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={styles.fLabel}>Explore page</label>
            <select
              style={styles.fInput}
              value={f.page}
              onChange={(e) =>
                setF((p) => ({ ...p, page: e.target.value as ExplorePage, category: "", tags: [] }))
              }
            >
              {Object.entries(EXPLORE_PAGES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {!isEducation && (
            <div style={{ flex: 1 }}>
              <label style={styles.fLabel}>Category (filter chip)</label>
              <select style={styles.fInput} value={f.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">Select…</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isEducation && (
          <>
            <label style={styles.fLabel}>School type (select all that apply)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {cfg.categories.map((c) => (
                <label key={c} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: ".85rem" }}>
                  <input type="checkbox" checked={f.tags.includes(c)} onChange={() => toggleTag(c)} />
                  {c}
                </label>
              ))}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 3 }}>
            <label style={styles.fLabel}>Tag shown on the card (optional)</label>
            <input
              style={styles.fInput}
              value={f.tag}
              placeholder={(isEducation ? f.tags.join(" & ") : f.category) || "e.g. Bakeshop"}
              onChange={(e) => set("tag", e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.fLabel}>Map pin</label>
            <input
              style={styles.fInput}
              value={f.pin}
              maxLength={4}
              placeholder="🏪"
              onChange={(e) => set("pin", e.target.value)}
            />
          </div>
        </div>
        <div style={styles.hintText}>Leave the pin empty to use the default for this category.</div>

        <label style={styles.fLabel}>Address / street</label>
        <input
          style={styles.fInput}
          value={f.address}
          placeholder="Villafuerte St., Calinan Poblacion"
          onChange={(e) => set("address", e.target.value)}
        />

        <label style={styles.fLabel}>Description</label>
        <textarea
          style={{ ...styles.fInput, minHeight: 90 }}
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <label style={styles.fLabel}>Map location</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={styles.fInput} placeholder="Latitude" value={f.lat} onChange={(e) => set("lat", e.target.value)} />
          <input style={styles.fInput} placeholder="Longitude" value={f.lng} onChange={(e) => set("lng", e.target.value)} />
          <button type="button" style={styles.modalCancelBtn} onClick={geocode}>Find</button>
        </div>

        <label style={styles.fLabel}>Photo</label>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {f.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.image} alt="Preview" style={styles.photoPreview} />
          ) : (
            <div style={{ ...styles.photoPreview, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ab" }}>
              No photo
            </div>
          )}
          <div style={{ flex: 1 }}>
            <input
              style={styles.fInput}
              placeholder="Paste an image link…"
              value={f.image}
              onChange={(e) => set("image", e.target.value)}
            />
            <div style={{ marginTop: 8 }}>
              <label style={{ ...styles.smallBtn, display: "inline-block", opacity: uploading ? 0.6 : 1 }}>
                {uploading ? "Uploading…" : "Upload a photo"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {photoChoices.length > 0 && (
          <>
            <div style={{ ...styles.hintText, marginTop: 10 }}>Or pick one of the owner&apos;s photos:</div>
            <div style={{ ...styles.thumbRow, marginTop: 6 }}>
              {photoChoices.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`Owner photo ${i + 1}`}
                  onClick={() => set("image", url)}
                  style={{ ...styles.thumb, outline: f.image === url ? "3px solid #1a5c38" : "none" }}
                />
              ))}
            </div>
          </>
        )}

        <label style={{ ...styles.fLabel, display: "flex", gap: 8, alignItems: "center", marginTop: 14 }}>
          <input type="checkbox" checked={f.published} onChange={(e) => set("published", e.target.checked)} />
          Visible on Explore
        </label>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button style={styles.modalCancelBtn} onClick={onClose} disabled={busy}>Cancel</button>
          <button style={styles.approveBtnSolid} onClick={submit} disabled={busy || uploading}>
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}