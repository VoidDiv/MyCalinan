/* ============================================================
   Page translator (English → Cebuano)

   Walks the page's text (and placeholder / title / alt / aria-label
   attributes), sends new sentences to /api/translate, and swaps the
   text in place. A MutationObserver keeps translating anything that
   appears later (page changes, data loading, map popups).

   - Translations are remembered on the device (localStorage), so
     repeat visits and OFFLINE use are instant and free.
   - Anything marked  translate="no"  or class="notranslate"  is skipped
     (use it for names, phone numbers, brand names).
   - Admin pages are never translated.

   To go back to English the page is simply reloaded (see
   LanguageProvider) — that is the most reliable way to restore it.
   ============================================================ */

const ENDPOINT = "/api/translate";
const STORAGE_KEY = "mycalinan_i18n_ceb_v1";
const MAX_CACHE_ENTRIES = 3000;
const MAX_STRINGS = 100;
const MAX_CHARS_PER_REQUEST = 12000;
const MAX_FAILURES = 3;

const ATTRS = ["placeholder", "title", "alt", "aria-label"] as const;

const SKIP_SELECTOR = [
  '[translate="no"]',
  ".notranslate",
  "script",
  "style",
  "noscript",
  "code",
  "pre",
  "textarea",
  "svg",
  "canvas",
  "iframe",
  '[contenteditable=""]',
  '[contenteditable="true"]',
].join(",");

type Applier = (translated: string) => void;

function isAdminPage(): boolean {
  return window.location.pathname.toLowerCase().startsWith("/adminpage");
}

function worthTranslating(core: string): boolean {
  if (core.length < 2 || core.length > 2000) return false;
  if (!/\p{L}/u.test(core)) return false; // numbers, emoji, symbols only
  if (/^(https?:\/\/|www\.)\S+$/i.test(core)) return false; // links
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(core)) return false; // e-mail addresses
  return true;
}

function loadCache(): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return new Map();
  }
}

export function startPageTranslator(): () => void {
  const cache = loadCache();
  const textState = new WeakMap<Text, { applied: string }>();
  const attrState = new WeakMap<Element, Record<string, string>>();
  const pending = new Map<string, Applier[]>();

  let stopped = false;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;

  /* ── remember translations on the device ── */
  function persistSoon() {
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      try {
        let entries = [...cache.entries()];
        if (entries.length > MAX_CACHE_ENTRIES) {
          entries = entries.slice(entries.length - MAX_CACHE_ENTRIES);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
      } catch {
        /* storage full or blocked — fine */
      }
    }, 1000);
  }

  /* ── ask the server for translations we don't have yet ── */
  function scheduleFlush() {
    if (flushTimer || stopped) return;
    flushTimer = setTimeout(flush, 150);
  }

  async function flush() {
    flushTimer = null;
    if (stopped || pending.size === 0) return;

    if (!navigator.onLine) {
      pending.clear(); // offline: leave the English; retried when we are back online
      return;
    }

    const entries = [...pending.entries()];
    pending.clear();

    // split into request-sized chunks
    const chunks: [string, Applier[]][][] = [];
    let current: [string, Applier[]][] = [];
    let chars = 0;
    for (const entry of entries) {
      if (current.length >= MAX_STRINGS || chars + entry[0].length > MAX_CHARS_PER_REQUEST) {
        chunks.push(current);
        current = [];
        chars = 0;
      }
      current.push(entry);
      chars += entry[0].length;
    }
    if (current.length) chunks.push(current);

    for (const chunk of chunks) {
      if (stopped) return;
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: chunk.map(([text]) => text), target: "ceb" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as { translations?: string[] };
        failures = 0;

        chunk.forEach(([text, appliers], i) => {
          const translated = data.translations?.[i];
          if (typeof translated === "string" && translated.trim()) {
            cache.set(text, translated);
            appliers.forEach((apply) => apply(translated));
          }
        });
        persistSoon();
      } catch (err) {
        failures += 1;
        console.warn("Translation request failed:", err);
        if (failures >= MAX_FAILURES) {
          console.warn("Translator paused after repeated failures — the page stays in English.");
          stopped = true;
          observer.disconnect();
          return;
        }
      }
    }
  }

  function queue(core: string, apply: Applier) {
    const list = pending.get(core);
    if (list) list.push(apply);
    else pending.set(core, [apply]);
    scheduleFlush();
  }

  /* ── text nodes ── */
  function visitText(node: Text) {
    const value = node.nodeValue ?? "";
    if (textState.get(node)?.applied === value) return; // our own change

    const core = value.trim();
    if (!worthTranslating(core)) return;

    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP_SELECTOR)) return;

    const apply: Applier = (translated) => {
      if (node.nodeValue !== value) return; // changed while we were waiting
      const lead = value.match(/^\s*/)?.[0] ?? "";
      const trail = value.match(/\s*$/)?.[0] ?? "";
      const next = lead + translated + trail;
      textState.set(node, { applied: next });
      node.nodeValue = next;
    };

    const hit = cache.get(core);
    if (hit !== undefined) apply(hit);
    else queue(core, apply);
  }

  /* ── attributes (placeholder, title, alt, aria-label) ── */
  function visitAttr(el: Element, name: string) {
    const value = el.getAttribute(name);
    if (!value) return;
    if (attrState.get(el)?.[name] === value) return; // our own change

    const core = value.trim();
    if (!worthTranslating(core)) return;
    if (el.closest(SKIP_SELECTOR)) return;

    const apply: Applier = (translated) => {
      if (el.getAttribute(name) !== value) return;
      const states = attrState.get(el) ?? {};
      states[name] = translated;
      attrState.set(el, states);
      el.setAttribute(name, translated);
    };

    const hit = cache.get(core);
    if (hit !== undefined) apply(hit);
    else queue(core, apply);
  }

  function scan(root: Node) {
    if (stopped || isAdminPage()) return;

    if (root.nodeType === Node.TEXT_NODE) {
      visitText(root as Text);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      visitText(node as Text);
      node = walker.nextNode();
    }

    const elements: Element[] =
      root.nodeType === Node.ELEMENT_NODE ? [root as Element] : [];
    const scope = root as Element | Document;
    scope.querySelectorAll?.(ATTRS.map((a) => `[${a}]`).join(",")).forEach((el) => elements.push(el));
    for (const el of elements) for (const name of ATTRS) visitAttr(el, name);
  }

  /* ── watch for anything that changes later ── */
  const observer = new MutationObserver((mutations) => {
    if (stopped || isAdminPage()) return;
    for (const m of mutations) {
      if (m.type === "characterData") visitText(m.target as Text);
      else if (m.type === "attributes") visitAttr(m.target as Element, m.attributeName ?? "");
      else m.addedNodes.forEach((n) => scan(n));
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });

  const onOnline = () => scan(document.body);
  window.addEventListener("online", onOnline);

  scan(document.body);

  return () => {
    stopped = true;
    observer.disconnect();
    window.removeEventListener("online", onOnline);
    if (flushTimer) clearTimeout(flushTimer);
    if (persistTimer) clearTimeout(persistTimer);
  };
}