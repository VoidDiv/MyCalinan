/* ============================================================
   FILE: app/adminpage/AdminListings/ExplorePanel.tsx   (REPLACE whole file)
   Manage EVERYTHING that shows on the Explore pages: the
   built-in establishments, listings published from business
   applications, and ones you add yourself.

   In this version:
   - Imports the single merged seed file (exploreSeed.ts, which now
     includes food, finance, education and community as well —
     exploreSeedMore.ts has been folded in and removed).
   - Import banner is per page, and skips places that already exist
     under a different document ID (same name + same spot).
   - "Possible duplicate" badge + filter.
   - "Delete legacy duplicates" button. It removes every Legacy row
     that has a Built-in twin at the same spot, in one go. It never
     touches Built-in, Admin, or Business listings.
   ============================================================ */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/Firebase";
import { EXPLORE_SEED } from "@/data/exploreSeed";
import {
  ADMIN_SOURCE,
  EXPLORE_PAGES,
  LISTING_SOURCE,
  PAGE_COLLECTION,
  toExploreDoc,
  type ExplorePage,
  type ListingData,
} from "@/types/listing";
import ListingModal from "./ListingModal";
import { styles } from "./styles";

const PAGES = Object.keys(EXPLORE_PAGES) as ExplorePage[];
const NO_ORDER = Number.MAX_SAFE_INTEGER;

/* ── All built-in listings, from the single merged seed file ── */
type SeedListing = ListingData & { id: string };
const ALL_SEED: Partial<Record<ExplorePage, SeedListing[]>> = EXPLORE_SEED;

/* Two entries count as the same place if the name matches and they are
   within roughly 20 m of each other (or one has no coordinates). */
const SAME_SPOT_TOLERANCE = 0.0002;

const normName = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function sameSpot(
  a: { name: string; lat?: number | null; lng?: number | null },
  b: { name: string; lat?: number | null; lng?: number | null }
): boolean {
  if (normName(a.name) !== normName(b.name)) return false;
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return true;
  return (
    Math.abs(a.lat - b.lat) < SAME_SPOT_TOLERANCE &&
    Math.abs(a.lng - b.lng) < SAME_SPOT_TOLERANCE
  );
}

/* Seeds for a page that are not in Firestore yet, by ID or by name + spot. */
function missingSeeds(
  page: ExplorePage,
  existing: ExploreRow[]
): { seed: SeedListing; index: number }[] {
  const ids = new Set(existing.map((r) => r.docId));
  return (ALL_SEED[page] ?? [])
    .map((seed, index) => ({ seed, index }))
    .filter(
      ({ seed }) => !ids.has(seed.id) && !existing.some((r) => sameSpot(seed, r))
    );
}

/* ── One row in the table, normalised from whatever is stored ── */
interface ExploreRow {
  key: string;
  docId: string;
  page: ExplorePage;
  name: string;
  category: string;
  tags: string[];
  tag: string;
  pin: string;
  description: string;
  address: string;
  image: string;
  lat: number | null;
  lng: number | null;
  mapsQuery: string;
  published: boolean;
  source: string;
  seeded: boolean;
  businessId?: string;
  order: number;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function toRow(page: ExplorePage, docId: string, d: Record<string, unknown>): ExploreRow {
  const category = str(d.category) || str(d.tag);
  return {
    key: `${page}/${docId}`,
    docId,
    page,
    name: str(d.name) || str(d.title) || "(untitled)",
    category,
    tags: Array.isArray(d.tags)
      ? d.tags.filter((t): t is string => typeof t === "string")
      : category
      ? [category]
      : [],
    tag: str(d.tag) || str(d.displayTag) || category,
    pin: str(d.pin),
    description: str(d.description),
    address: str(d.address) || str(d.location),
    image: str(d.image) || str(d.imageSrc),
    lat: num(d.lat),
    lng: num(d.lng),
    mapsQuery: str(d.mapsQuery),
    published: d.published !== false,
    source: str(d.source) || "legacy",
    seeded: d.seeded === true,
    businessId: str(d.businessId) || undefined,
    order: typeof d.order === "number" ? d.order : NO_ORDER,
  };
}

function rowToListing(row: ExploreRow): Partial<ListingData> {
  return {
    name: row.name,
    page: row.page,
    category: row.category,
    tags: row.tags,
    tag: row.tag,
    pin: row.pin,
    description: row.description,
    address: row.address,
    image: row.image,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    mapsQuery: row.mapsQuery,
    published: row.published,
  };
}

function sourceLabel(row: ExploreRow): string {
  if (row.seeded) return "Built-in";
  if (row.source === LISTING_SOURCE) return "Business";
  if (row.source === ADMIN_SOURCE) return "Admin";
  return "Legacy";
}

/* Keep a business application's copy of its listing in step (best effort). */
async function syncBusiness(businessId: string, patch: Record<string, unknown>) {
  try {
    await updateDoc(doc(db, "businesses", businessId), patch);
  } catch (e) {
    console.warn("Could not update the linked application:", e);
  }
}

type VisFilter = "all" | "live" | "hidden" | "dupes";

export default function ExplorePanel({
  photoLookup,
}: {
  /** Returns the owner's photos for a business application, if we have them. */
  photoLookup: (businessId: string) => string[];
}) {
  const [rows, setRows] = useState<Partial<Record<ExplorePage, ExploreRow[]>>>({});
  const [loaded, setLoaded] = useState<ExplorePage[]>([]);
  const [loadError, setLoadError] = useState(false);

  const [pageFilter, setPageFilter] = useState<ExplorePage | "all">("all");
  const [visFilter, setVisFilter] = useState<VisFilter>("all");
  const [search, setSearch] = useState("");

  // "new" = adding, a row = editing it
  const [editing, setEditing] = useState<ExploreRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ExploreRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const importingRef = useRef(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  /* Live view of every Explore collection */
  useEffect(() => {
    const unsubs = PAGES.map((page) =>
      onSnapshot(
        collection(db, PAGE_COLLECTION[page]),
        (snap) => {
          setRows((prev) => ({
            ...prev,
            [page]: snap.docs.map((d) => toRow(page, d.id, d.data())),
          }));
          setLoaded((prev) => (prev.includes(page) ? prev : [...prev, page]));
        },
        (err) => {
          console.error(`Explore (${page}) listen error:`, err);
          setLoadError(true);
          setLoaded((prev) => (prev.includes(page) ? prev : [...prev, page]));
        }
      )
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(t);
  }, [notice]);

  const allLoaded = loaded.length === PAGES.length;

  const allRows = useMemo(
    () =>
      PAGES.flatMap((p) => rows[p] ?? []).sort(
        (a, b) =>
          PAGES.indexOf(a.page) - PAGES.indexOf(b.page) ||
          a.order - b.order ||
          a.name.localeCompare(b.name)
      ),
    [rows]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allRows.length };
    PAGES.forEach((p) => (c[p] = (rows[p] ?? []).length));
    return c;
  }, [allRows, rows]);

  /* Rows that have a twin on the same page (same name, same spot) */
  const dupKeys = useMemo(() => {
    const groups = new Map<string, ExploreRow[]>();
    allRows.forEach((r) => {
      const k = `${r.page}|${normName(r.name)}`;
      groups.set(k, [...(groups.get(k) ?? []), r]);
    });
    const out = new Set<string>();
    groups.forEach((list) => {
      if (list.length < 2) return;
      list.forEach((a, i) =>
        list.forEach((b, j) => {
          if (i !== j && sameSpot(a, b)) out.add(a.key);
        })
      );
    });
    return out;
  }, [allRows]);

  /* Legacy rows that have a Built-in twin at the same spot.
     These are the safe ones to delete: the Built-in copy stays. */
  const legacyDupes = useMemo(() => {
    const builtIns = allRows.filter((r) => r.seeded);
    return allRows.filter(
      (r) =>
        sourceLabel(r) === "Legacy" &&
        !r.businessId &&
        builtIns.some((b) => b.page === r.page && sameSpot(b, r))
    );
  }, [allRows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allRows.filter((r) => {
      if (pageFilter !== "all" && r.page !== pageFilter) return false;
      if (visFilter === "live" && !r.published) return false;
      if (visFilter === "hidden" && r.published) return false;
      if (visFilter === "dupes" && !dupKeys.has(r.key)) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.tag.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
      );
    });
    // Put twins next to each other so they are easy to compare
    if (visFilter === "dupes") {
      list.sort(
        (a, b) =>
          PAGES.indexOf(a.page) - PAGES.indexOf(b.page) ||
          normName(a.name).localeCompare(normName(b.name))
      );
    }
    return list;
  }, [allRows, pageFilter, visFilter, search, dupKeys]);

  /* Pages whose built-ins have never been imported (and still have something to add).
     A page drops out of this list as soon as one built-in exists on it, so anything
     you delete afterwards stays deleted. */
  const pagesToImport = useMemo(
    () =>
      allLoaded
        ? PAGES.filter(
            (p) =>
              (ALL_SEED[p]?.length ?? 0) > 0 &&
              !(rows[p] ?? []).some((r) => r.seeded) &&
              missingSeeds(p, rows[p] ?? []).length > 0
          )
        : [],
    [allLoaded, rows]
  );

  const importTotal = useMemo(
    () => pagesToImport.reduce((n, p) => n + missingSeeds(p, rows[p] ?? []).length, 0),
    [pagesToImport, rows]
  );

  /* ── Actions ── */

  async function importBuiltIns() {
    if (importingRef.current) return;
    importingRef.current = true;
    setImporting(true);
    setNotice(null);
    try {
      let added = 0;
      for (const page of pagesToImport) {
        const todo = missingSeeds(page, rows[page] ?? []);
        let batch = writeBatch(db);
        let ops = 0;
        for (const { seed, index } of todo) {
          const { id, ...data } = seed;
          batch.set(doc(db, PAGE_COLLECTION[page], id), {
            ...toExploreDoc(data, undefined, ADMIN_SOURCE),
            seeded: true,
            order: index,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          added++;
          if (++ops === 400) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
          }
        }
        if (ops > 0) await batch.commit();
      }
      setNotice({
        ok: true,
        text: `Imported ${added} built-in listings. They are now fully editable here.`,
      });
    } catch (e) {
      console.error(e);
      setNotice({
        ok: false,
        text: "Import failed. Make sure you are signed in as admin and that the updated Firestore rules are published.",
      });
    } finally {
      importingRef.current = false;
      setImporting(false);
    }
  }

  /* Delete every Legacy row that has a Built-in twin (one click). */
  async function deleteLegacyDupes() {
    if (bulkBusy) return;
    const targets = [...legacyDupes]; // snapshot, so the list can't shift mid-delete
    setBulkBusy(true);
    try {
      let batch = writeBatch(db);
      let ops = 0;
      for (const r of targets) {
        batch.delete(doc(db, PAGE_COLLECTION[r.page], r.docId));
        if (++ops === 400) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      }
      if (ops > 0) await batch.commit();
      setNotice({
        ok: true,
        text: `Deleted ${targets.length} legacy duplicates. The Built-in copies were kept.`,
      });
    } catch (e) {
      console.error(e);
      setNotice({
        ok: false,
        text: "Could not delete the legacy duplicates. Check your admin sign-in and Firestore rules.",
      });
    } finally {
      setBulkBusy(false);
      setConfirmBulk(false);
    }
  }

  async function saveListing(target: ExploreRow | null, data: ListingData) {
    if (target) {
      // Legacy docs get adopted under "admin" the first time you edit them
      const source =
        target.source === LISTING_SOURCE || target.source === ADMIN_SOURCE
          ? target.source
          : ADMIN_SOURCE;

      const batch = writeBatch(db);
      if (target.page !== data.page) {
        batch.delete(doc(db, PAGE_COLLECTION[target.page], target.docId)); // moved to another page
      }
      batch.set(
        doc(db, PAGE_COLLECTION[data.page], target.docId),
        {
          ...toExploreDoc(data, target.businessId, source),
          order: target.order === NO_ORDER ? Date.now() : target.order,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await batch.commit();
      if (target.businessId) await syncBusiness(target.businessId, { listing: data });
    } else {
      const ref = doc(collection(db, PAGE_COLLECTION[data.page]));
      await setDoc(ref, {
        ...toExploreDoc(data, undefined, ADMIN_SOURCE),
        order: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    setEditing(null);
    setNotice({ ok: true, text: target ? "Listing saved." : "Listing added to Explore." });
  }

  async function toggleVisible(row: ExploreRow) {
    const next = !row.published;
    try {
      await updateDoc(doc(db, PAGE_COLLECTION[row.page], row.docId), {
        published: next,
        updatedAt: serverTimestamp(),
      });
      if (row.businessId && row.lat != null && row.lng != null) {
        await syncBusiness(row.businessId, {
          listing: { ...rowToListing(row), published: next },
        });
      }
      setNotice({
        ok: true,
        text: next ? `“${row.name}” is now visible.` : `“${row.name}” is hidden from Explore.`,
      });
    } catch (e) {
      console.error(e);
      setNotice({ ok: false, text: "Could not change visibility. Check your admin sign-in and rules." });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteDoc(doc(db, PAGE_COLLECTION[deleting.page], deleting.docId));
      if (deleting.businessId) {
        await syncBusiness(deleting.businessId, { listing: deleteField() });
      }
      setNotice({ ok: true, text: `“${deleting.name}” was deleted from Explore.` });
    } catch (e) {
      console.error(e);
      setNotice({ ok: false, text: "Could not delete. Check your admin sign-in and rules." });
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  }

  const editingRow = editing && editing !== "new" ? editing : null;

  return (
    <>
      {notice && <div style={notice.ok ? styles.noticeOk : styles.noticeErr}>{notice.text}</div>}
      {loadError && (
        <div style={styles.noticeErr}>
          ⚠️ Some Explore collections could not be loaded. Check your Firestore rules.
        </div>
      )}

      {importTotal > 0 && (
        <div style={styles.importBanner}>
          <div>
            <strong>Import your built-in establishments</strong>
            <br />
            {importTotal} built-in listings (
            {pagesToImport.map((p) => EXPLORE_PAGES[p].label).join(", ")}) can be copied into
            Firestore. Places that already exist here under the same name and location are skipped,
            so nothing gets doubled. After that you can edit, hide, delete or reorder them here, and
            the Explore pages read only from Firestore.
          </div>
          <button style={styles.approveBtnSolid} onClick={importBuiltIns} disabled={importing}>
            {importing ? "Importing…" : `Import ${importTotal} listings`}
          </button>
        </div>
      )}

      {legacyDupes.length > 0 && (
        <div style={styles.importBanner}>
          <div>
            <strong>{legacyDupes.length} legacy duplicates found</strong>
            <br />
            These are older copies (no photo) of places that already exist as Built-in listings.
            Deleting them keeps the Built-in versions and removes the extras.
          </div>
          <button
            style={styles.smallBtnDanger}
            onClick={() => setConfirmBulk(true)}
            disabled={bulkBusy}
          >
            Delete {legacyDupes.length} legacy duplicates
          </button>
        </div>
      )}

      {/* Page chips */}
      <div style={styles.filterRow}>
        {(["all", ...PAGES] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPageFilter(p)}
            style={{ ...styles.filterChip, ...(pageFilter === p ? styles.filterChipActive : {}) }}
          >
            {p === "all" ? "All pages" : EXPLORE_PAGES[p].label} ({counts[p] ?? 0})
          </button>
        ))}
      </div>

      {/* Search + visibility + add */}
      <div style={styles.exploreBar}>
        <input
          style={styles.searchInput}
          placeholder="Search name, category, address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={styles.selectInput}
          value={visFilter}
          onChange={(e) => setVisFilter(e.target.value as VisFilter)}
        >
          <option value="all">Live &amp; hidden</option>
          <option value="live">Live only</option>
          <option value="hidden">Hidden only</option>
          <option value="dupes">Possible duplicates ({dupKeys.size})</option>
        </select>
        <button style={styles.approveBtnSolid} onClick={() => setEditing("new")}>
          <i className="fas fa-plus" /> Add listing
        </button>
      </div>

      {!allLoaded && <div style={styles.panelState}>Loading Explore listings…</div>}

      {allLoaded && visibleRows.length === 0 && (
        <div style={styles.panelState}>
          {allRows.length === 0
            ? "Nothing on Explore yet. Import the built-in listings above, or add one."
            : visFilter === "dupes"
            ? "No possible duplicates found. 🎉"
            : "No listings match your filters."}
        </div>
      )}

      {allLoaded && visibleRows.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} />
                <th style={styles.th}>Listing</th>
                <th style={styles.th}>Page › Category</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.key}>
                  <td style={styles.td}>
                    {row.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.image} alt={row.name} style={styles.rowThumb} />
                    ) : (
                      <div style={styles.rowThumbEmpty}>{row.pin || "📍"}</div>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.rowName}>
                      {row.name}
                      {dupKeys.has(row.key) && (
                        <span
                          title="Another listing on this page has the same name and location"
                          style={{
                            ...styles.srcBadge,
                            marginLeft: 8,
                            background: "#fff3cd",
                            color: "#856404",
                          }}
                        >
                          ⚠️ Possible duplicate
                        </span>
                      )}
                    </div>
                    <div style={styles.rowSub}>{row.address || row.tag}</div>
                  </td>
                  <td style={styles.td}>
                    {EXPLORE_PAGES[row.page].label} › {row.category || "—"}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.srcBadge}>{sourceLabel(row)}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={row.published ? styles.pillLive : styles.pillHidden}>
                      {row.published ? "🟢 Live" : "⚪ Hidden"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.rowActions}>
                      <button style={styles.smallBtn} onClick={() => setEditing(row)}>Edit</button>
                      <button style={styles.smallBtn} onClick={() => toggleVisible(row)}>
                        {row.published ? "Hide" : "Show"}
                      </button>
                      <button style={styles.smallBtnDanger} onClick={() => setDeleting(row)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ListingModal
          key={editingRow ? editingRow.key : "new"}
          title={editingRow ? "Edit listing" : "Add listing to Explore"}
          submitLabel={editingRow ? "Save changes" : "Add to Explore"}
          initial={
            editingRow
              ? rowToListing(editingRow)
              : { page: pageFilter === "all" ? "food" : pageFilter, published: true }
          }
          notice={
            editingRow?.businessId
              ? "This listing came from a business application. Changes here are also saved to that application."
              : undefined
          }
          photoChoices={editingRow?.businessId ? photoLookup(editingRow.businessId) : []}
          onClose={() => setEditing(null)}
          onSave={(data) => saveListing(editingRow, data)}
        />
      )}

      {deleting && (
        <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setDeleting(null)}>
          <div style={styles.modalBox}>
            <i className="fas fa-trash" style={{ color: "#c0392b", fontSize: "2rem", marginBottom: 10 }} />
            <h3 style={styles.modalTitle}>Delete “{deleting.name}”?</h3>
            <p style={styles.modalText}>
              It will be removed from the {EXPLORE_PAGES[deleting.page].label} page for good.
              {deleting.businessId
                ? " The business application stays, and you can publish it again later."
                : " If you only want to take it down for a while, use Hide instead."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={styles.modalCancelBtn} onClick={() => setDeleting(null)} disabled={deleteBusy}>
                Cancel
              </button>
              <button style={styles.modalRejectBtn} onClick={confirmDelete} disabled={deleteBusy}>
                {deleteBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBulk && (
        <div
          style={styles.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && !bulkBusy && setConfirmBulk(false)}
        >
          <div style={styles.modalBox}>
            <i className="fas fa-trash" style={{ color: "#c0392b", fontSize: "2rem", marginBottom: 10 }} />
            <h3 style={styles.modalTitle}>Delete {legacyDupes.length} legacy duplicates?</h3>
            <p style={styles.modalText}>
              Every listing marked <strong>Legacy</strong> that has a <strong>Built-in</strong> copy of
              the same place will be deleted for good. The Built-in copies, Admin listings, and
              Business listings are not touched.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={styles.modalCancelBtn} onClick={() => setConfirmBulk(false)} disabled={bulkBusy}>
                Cancel
              </button>
              <button style={styles.modalRejectBtn} onClick={deleteLegacyDupes} disabled={bulkBusy}>
                {bulkBusy ? "Deleting…" : `Delete ${legacyDupes.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}