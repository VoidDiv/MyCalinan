"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/Firebase";
import useAdminGuard from "@/hooks/useAdminGuard";
import AdminSidebar from "@/components/AdminSidebar";

type Rule = { title: string; body: string };
type Status = "loading" | "idle" | "saving" | "saved" | "error";

export default function AdminRules() {
  const { ready } = useAdminGuard();
  const [rules, setRules] = useState<Rule[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!ready) return;

    getDoc(doc(db, "settings", "rules"))
      .then((snap) => {
        const items = snap.exists() ? snap.data().items : [];
        setRules(Array.isArray(items) ? items : []);
        setStatus("idle");
      })
      .catch((err) => {
        console.error("Load rules error:", err);
        setStatus("error");
      });
  }, [ready]);

  function update(i: number, field: keyof Rule, value: string) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    setStatus("idle");
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rules.length) return;
    const next = [...rules];
    [next[i], next[j]] = [next[j], next[i]];
    setRules(next);
    setStatus("idle");
  }

  function remove(i: number) {
    if (!confirm("Papason ni nga rule?")) return;
    setRules((prev) => prev.filter((_, idx) => idx !== i));
    setStatus("idle");
  }

  function addRule() {
    setRules((prev) => [...prev, { title: "", body: "" }]);
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    try {
      const cleaned = rules
        .map((r) => ({ title: r.title.trim(), body: r.body.trim() }))
        .filter((r) => r.title);
      await setDoc(doc(db, "settings", "rules"), {
        items: cleaned,
        updatedAt: serverTimestamp(),
      });
      setRules(cleaned);
      setStatus("saved");
    } catch (err) {
      console.error("Save rules error:", err);
      setStatus("error");
    }
  }

  if (!ready) return null;

  return (
    <div style={styles.body}>
      <style>{`
        @media (max-width: 768px) {
          .admin-content { margin-left: 200px !important; padding: 18px !important; }
        }
        @media (max-width: 540px) {
          .admin-content { margin-left: 0 !important; }
        }
      `}</style>

      <AdminSidebar />

      <main className="admin-content" style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.headerH1}>
            <i className="fas fa-gavel" style={{ color: "#1a5c38", marginRight: 8 }} />
            Rules and Regulations
          </h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={{ ...styles.addBtn, ...styles.addBtnOutline }} onClick={addRule}>
              <i className="fas fa-plus" /> Add Rule
            </button>
            <button
              style={{
                ...styles.addBtn,
                opacity: status === "saving" || status === "loading" ? 0.6 : 1,
              }}
              onClick={save}
              disabled={status === "saving" || status === "loading"}
            >
              <i className="fas fa-save" /> {status === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        <p style={styles.subtitle}>
          Ang mga rule dinhi makita sa home page sa Barangay Calinan Poblacion.
        </p>

        {status === "saved" && (
          <div style={{ ...styles.notice, ...styles.noticeOk }}>
            <i className="fas fa-check-circle" /> Na-save na ang mga rule.
          </div>
        )}
        {status === "error" && (
          <div style={{ ...styles.notice, ...styles.noticeErr }}>
            <i className="fas fa-exclamation-triangle" /> Naay problema. Tan-awa ang console.
          </div>
        )}

        <section style={styles.panel}>
          <div style={styles.panelHead}>
            <h2 style={styles.panelH2}>
              <i className="fas fa-list-ol" style={{ color: "#1a5c38", marginRight: 6 }} />
              Listahan sa mga Rule
            </h2>
            <span style={styles.panelHeadLink}>{rules.length} ka rule</span>
          </div>

          {status === "loading" && <div style={styles.panelState}>Loading...</div>}

          {status !== "loading" && rules.length === 0 && (
            <div style={styles.panelState}>
              Wala pay rule. I-click ang &quot;Add Rule&quot; aron magsugod.
            </div>
          )}

          {rules.map((rule, i) => (
            <div
              key={i}
              style={{
                ...styles.ruleRow,
                borderBottom: i === rules.length - 1 ? "none" : "1px solid #f0f4f0",
              }}
            >
              <div style={styles.ruleNum}>{String(i + 1).padStart(2, "0")}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  value={rule.title}
                  onChange={(e) => update(i, "title", e.target.value)}
                  placeholder="Titulo sa rule"
                  style={styles.input}
                />
                <textarea
                  value={rule.body}
                  onChange={(e) => update(i, "body", e.target.value)}
                  placeholder="Detalye sa rule"
                  rows={3}
                  style={{ ...styles.input, marginTop: 8, resize: "vertical", fontWeight: 400 }}
                />
              </div>

              <div style={styles.ruleActions}>
                <button
                  style={styles.iconBtn}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  title="Ibabaw"
                >
                  <i className="fas fa-arrow-up" />
                </button>
                <button
                  style={styles.iconBtn}
                  onClick={() => move(i, 1)}
                  disabled={i === rules.length - 1}
                  title="Ibaba"
                >
                  <i className="fas fa-arrow-down" />
                </button>
                <button style={styles.deleteBtn} onClick={() => remove(i)} title="Papas">
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f0f4f8",
    display: "flex",
    minHeight: "100vh",
  },
  content: { marginLeft: 240, padding: "32px 36px", flex: 1 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 12,
  },
  headerH1: { fontSize: "1.4rem", color: "#1a3d28", fontWeight: 700 },
  subtitle: { fontSize: ".85rem", color: "#778", marginBottom: 24 },
  addBtn: {
    background: "#1a5c38",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: ".88rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
  },
  addBtnOutline: { background: "#fff", color: "#1a5c38", border: "1.5px solid #1a5c38" },
  notice: {
    borderRadius: 10,
    padding: "12px 18px",
    marginBottom: 18,
    fontSize: ".86rem",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  noticeOk: { background: "#d4edda", border: "1px solid #b7dfc2", color: "#155724" },
  noticeErr: { background: "#fde8e6", border: "1px solid #f5c2bd", color: "#a12a1f" },
  panel: {
    background: "#fff",
    borderRadius: 12,
    padding: "24px 26px",
    boxShadow: "0 2px 10px rgba(0,0,0,.07)",
  },
  panelHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "2px solid #e8f5ee",
  },
  panelH2: { fontSize: "1rem", fontWeight: 700, color: "#1a3d28" },
  panelHeadLink: { fontSize: ".8rem", color: "#1a5c38", fontWeight: 600 },
  panelState: { textAlign: "center", padding: "30px 10px", color: "#888", fontSize: ".86rem" },
  ruleRow: { display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 0" },
  ruleNum: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: "#e8f5ee",
    color: "#1a5c38",
    fontSize: ".8rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #d5e3db",
    borderRadius: 8,
    fontSize: ".9rem",
    fontWeight: 600,
    color: "#1a3d28",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  },
  ruleActions: { display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid #d5e3db",
    background: "#fff",
    color: "#1a5c38",
    cursor: "pointer",
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: "1px solid #e74c3c",
    background: "#fff",
    color: "#e74c3c",
    cursor: "pointer",
  },
};