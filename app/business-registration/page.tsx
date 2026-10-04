/* ============================================================
   FILE: app/business-registration/page.tsx   (REPLACE whole file)
   PAGE: Business Registration Form (LOGGED-IN BUSINESS OWNERS)
   URL:  /business-registration

   NEW IN THIS VERSION (accurate location):
   - Step 2 now asks for the business ADDRESS and for the owner to PIN the
     business on a map (components/LocationPicker.tsx): tap the map or drag
     the big ring onto the building, switch to 🛰 Satellite to see the roof, or
     press 📍 "Use my current location" when standing at the business (the
     most precise GPS reading is used, and the ±accuracy is saved).
   - Saved on the application: address, lat, lng, locationMethod
     ("map" | "gps" | "typed") and, for GPS, locationAccuracyM.
   - In Admin > Listings, the pin is pre-filled when the admin approves, so
     the admin only has to check it (on the satellite view) instead of
     searching for the place.

   FIXES FROM BEFORE (kept):
   - The Step 1 "Email" field is saved (as `email`) next to the Firebase Auth
     account email (`ownerEmail`).
   - Business picture previews no longer leak object URLs.
   - "Back to Home" link at the top of the form.
   ============================================================ */

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { storage, db, auth } from "@/lib/Firebase";
import { CURRENT_YEAR, MAX_BUSINESS_PICTURES } from "@/types/business";
import { REGISTRATION_GROUPS, encodeChoice, decodeChoice } from "@/types/listing";
import LocationPicker, { type PickedLocation } from "@/components/LocationPicker";
import { isInDavao } from "@/lib/geo";

/* ── Local form state ── */
interface FormState {
  fullName: string;
  email: string;
  phoneNumber: string;
  businessName: string;
  businessChoice: string; // "page::category" — see types/listing.ts
  yearOperation: string;
  address: string; // street / area of the business
}

const initialForm: FormState = {
  fullName: "",
  email: "",
  phoneNumber: "",
  businessName: "",
  businessChoice: "",
  yearOperation: String(CURRENT_YEAR),
  address: "",
};

/* Where the owner pinned the business */
interface BusinessLocation {
  lat: number | null;
  lng: number | null;
  /** only for a GPS pin: how precise the reading was (meters) */
  accuracyM?: number;
  method?: PickedLocation["method"];
}

/* A selected business picture, paired with its (revocable) preview URL. */
interface PictureEntry {
  file: File;
  previewUrl: string;
}

async function uploadSingleFile(file: File, path: string): Promise<{ name: string; url: string }> {
  const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const fileRef = ref(storage, `${path}/${safeName}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  return { name: file.name, url };
}

async function uploadMultipleFiles(files: File[], path: string): Promise<{ name: string; url: string }[]> {
  const uploaded: { name: string; url: string }[] = [];
  for (const file of files) {
    uploaded.push(await uploadSingleFile(file, path));
  }
  return uploaded;
}

export default function BusinessRegistrationPage() {
  const router = useRouter();

  /* ── Auth guard ── */
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const role =
        localStorage.getItem("mycalinan_role") ||
        sessionStorage.getItem("mycalinan_role");

      if (!user || role !== "user") {
        router.push("/login");
        return;
      }

      setUid(user.uid);
      setUserEmail(user.email || "");
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  /* ── Step control ── */
  const [step, setStep] = useState<1 | 2>(1);

  const [form, setForm] = useState<FormState>(initialForm);
  const [location, setLocation] = useState<BusinessLocation>({ lat: null, lng: null });

  // Single-file documents
  const [businessPermit, setBusinessPermit] = useState<File | null>(null);
  const [dti, setDti] = useState<File | null>(null);
  const [barangayClearance, setBarangayClearance] = useState<File | null>(null);
  const [barangayCertification, setBarangayCertification] = useState<File | null>(null);
  const [cedula, setCedula] = useState<File | null>(null);

  // Business pictures (up to 5) — each paired with its own preview URL
  const [businessPictures, setBusinessPictures] = useState<PictureEntry[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const picInputRef = useRef<HTMLInputElement>(null);

  /* Revoke every remaining preview URL when the page unmounts, so a
     back-navigation or route change doesn't leak blob URLs. */
  const picturesRef = useRef<PictureEntry[]>([]);
  useEffect(() => {
    picturesRef.current = businessPictures;
  }, [businessPictures]);
  useEffect(() => {
    return () => {
      picturesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePicFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const incoming: PictureEntry[] = Array.from(e.target.files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setBusinessPictures((prev) => {
      const combined = [...prev, ...incoming];
      if (combined.length > MAX_BUSINESS_PICTURES) {
        // Revoke the ones we're about to drop so they don't leak.
        combined.slice(MAX_BUSINESS_PICTURES).forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setError(`You can only upload up to ${MAX_BUSINESS_PICTURES} business pictures.`);
        return combined.slice(0, MAX_BUSINESS_PICTURES);
      }
      setError("");
      return combined;
    });

    // Reset the input so the same file(s) can be re-selected if removed later
    if (picInputRef.current) picInputRef.current.value = "";
  }

  function removePic(idx: number) {
    setBusinessPictures((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  /* ── Step 1 validation ── */
  function validateStep1(): string {
    if (!form.fullName.trim()) return "Full name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!form.phoneNumber.trim()) return "Phone number is required.";
    return "";
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep(2);
  }

  function handleBack() {
    setError("");
    setStep(1);
  }

  /* ── Step 2 validation ── */
  function validateStep2(): string {
    if (!form.businessName.trim()) return "Business name is required.";
    if (!decodeChoice(form.businessChoice)) return "Please select a business type.";
    if (!form.yearOperation.trim()) return "Year of operation is required.";
    if (!form.address.trim()) return "Please enter your business address (street or area).";
    if (location.lat === null || location.lng === null) {
      return "Please put the pin on the map where your business is.";
    }
    if (!isInDavao(location.lat, location.lng)) {
      return "The pin is outside Davao City. Please move it onto your business.";
    }
    if (!businessPermit) return "Please upload your Business Permit.";
    if (!dti) return "Please upload your DTI/SEC Registration.";
    if (!barangayClearance) return "Please upload your Barangay Clearance.";
    if (!barangayCertification) return "Please upload your Barangay Certification.";
    if (!cedula) return "Please upload your Cedula.";
    if (businessPictures.length === 0) return "Please upload at least one business picture.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!uid) {
      setError("You must be logged in to submit this form.");
      return;
    }

    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      return;
    }

    const choice = decodeChoice(form.businessChoice);
    if (!choice || location.lat === null || location.lng === null) {
      setError("Please select a business type and put the pin on the map.");
      return;
    }

    setSubmitting(true);
    try {
      const uploadFolder = `businesses/${uid}/${Date.now()}`;

      setProgressLabel("Uploading Business Permit...");
      const businessPermitUploaded = await uploadSingleFile(
        businessPermit as File,
        `${uploadFolder}/businessPermit`
      );

      setProgressLabel("Uploading DTI/SEC Registration...");
      const dtiUploaded = await uploadSingleFile(dti as File, `${uploadFolder}/dti`);

      setProgressLabel("Uploading Barangay Clearance...");
      const barangayClearanceUploaded = await uploadSingleFile(
        barangayClearance as File,
        `${uploadFolder}/barangayClearance`
      );

      setProgressLabel("Uploading Barangay Certification...");
      const barangayCertificationUploaded = await uploadSingleFile(
        barangayCertification as File,
        `${uploadFolder}/barangayCertification`
      );

      setProgressLabel("Uploading Cedula...");
      const cedulaUploaded = await uploadSingleFile(cedula as File, `${uploadFolder}/cedula`);

      setProgressLabel("Uploading business pictures...");
      const picturesUploaded = await uploadMultipleFiles(
        businessPictures.map((p) => p.file),
        `${uploadFolder}/pictures`
      );

      setProgressLabel("Saving your application...");
      await addDoc(collection(db, "businesses"), {
        ownerId: uid,
        ownerEmail: userEmail,

        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),

        businessName: form.businessName.trim(),
        businessType: choice.category,
        explorePage: choice.page,
        exploreCategory: choice.category,
        yearOperation: form.yearOperation.trim(),

        // Where the business is (pinned by the owner; the admin checks it when approving)
        address: form.address.trim(),
        lat: location.lat,
        lng: location.lng,
        locationMethod: location.method ?? "map",
        // (Firestore does not accept "undefined", so this field is only added for a GPS pin)
        ...(location.accuracyM !== undefined ? { locationAccuracyM: location.accuracyM } : {}),

        documents: {
          businessPermit: { ...businessPermitUploaded, status: "pending", rejectionReason: null },
          dti: { ...dtiUploaded, status: "pending", rejectionReason: null },
          barangayClearance: { ...barangayClearanceUploaded, status: "pending", rejectionReason: null },
          barangayCertification: { ...barangayCertificationUploaded, status: "pending", rejectionReason: null },
          cedula: { ...cedulaUploaded, status: "pending", rejectionReason: null },
          businessPictures: { urls: picturesUploaded, status: "pending", rejectionReason: null },
        },

        overallStatus: "pending",
        submittedAt: serverTimestamp(),
      });

      // Submission succeeded — revoke previews now, we don't need them anymore.
      businessPictures.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setSuccess(true);
    } catch (err) {
      console.error("Business registration submit error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting. Please try again."
      );
    } finally {
      setSubmitting(false);
      setProgressLabel("");
    }
  }

  if (checkingAuth) {
    return (
      <div className="business-reg-page">
        <div className="business-reg-card">
          <p style={{ textAlign: "center" }}>Checking your session...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="business-reg-page">
        <div className="business-reg-card">
          <div className="business-reg-success-icon">
            <i className="fas fa-check" />
          </div>
          <h2 className="business-reg-success-title">Application Submitted!</h2>
          <p className="business-reg-success-text">
            Thank you for registering your business. Your application is now pending
            review by the admin team. You&apos;ll be notified once it has been processed.
          </p>
          <Link href="/profile" className="business-reg-add-btn">
            <i className="fas fa-user" /> View My Profile
          </Link>
          <Link href="/" className="business-reg-home-link">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="business-reg-page">
      <div className="business-reg-card">
        <div style={{ marginBottom: 10 }}>
          <Link href="/" className="business-reg-home-link">
            <i className="fas fa-home" /> Back to Home
          </Link>
        </div>

        <div className="business-reg-header">
          <h1>
            <i className="fas fa-store" style={{ color: "var(--canopy-800)", marginRight: 8 }} />
            Business Registration
          </h1>
          <p>
            {step === 1
              ? "Step 1 of 2 — Your personal information."
              : "Step 2 of 2 — Your business details and documents."}
          </p>
        </div>

        {step === 1 && (
          <div
            style={{
              background: "#eef6f0",
              border: "1px solid #cfe3d6",
              color: "#1a5c38",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: ".82rem",
              marginBottom: 16,
              lineHeight: 1.45,
            }}
          >
            <i className="fas fa-info-circle" /> Explore lists established places people
            look for — restaurants, shops, clinics, gyms, banks and similar. Very small
            home-based stores, such as sari-sari stores, aren&apos;t listed.
          </div>
        )}

        {error && <div className="business-reg-error">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleNext}>
            <div className="business-reg-input-group">
              <label>Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Juan Dela Cruz"
              />
            </div>

            <div className="business-reg-input-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="juan@email.com"
              />
            </div>

            <div className="business-reg-input-group">
              <label>Phone Number</label>
              <input
                type="text"
                value={form.phoneNumber}
                onChange={(e) => updateField("phoneNumber", e.target.value)}
                placeholder="09XXXXXXXXX"
              />
            </div>

            <button type="submit" className="business-reg-submit-btn">
              Next <i className="fas fa-arrow-right" />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="business-reg-input-group">
              <label>Business Name</label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => updateField("businessName", e.target.value)}
                placeholder="e.g. Calinan Fresh Mart"
                disabled={submitting}
              />
            </div>

            <div className="business-reg-row">
              <div className="business-reg-input-group">
                <label>Business Type</label>
                <select
                  value={form.businessChoice}
                  onChange={(e) => updateField("businessChoice", e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select type</option>
                  {REGISTRATION_GROUPS.map((group) => (
                    <optgroup key={group.page} label={group.label}>
                      {group.categories.map((category) => (
                        <option key={category} value={encodeChoice(group.page, category)}>
                          {category}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className="business-reg-hint">
                  Pick the closest match — this is where your business will appear on Explore.
                </span>
              </div>

              <div className="business-reg-input-group">
                <label>Year of Operation</label>
                <input
                  type="number"
                  min={1900}
                  max={CURRENT_YEAR}
                  value={form.yearOperation}
                  onChange={(e) => updateField("yearOperation", e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="business-reg-input-group">
              <label>Business Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="e.g. Villafuerte St., Calinan Poblacion"
                disabled={submitting}
              />
            </div>

            <div className="business-reg-input-group">
              <label>Where is your business? Pin it on the map</label>
              <span className="business-reg-hint">
                This is the spot people will be guided to, so please be exact. Tap the map or drag the big
                ring onto your building. Turn on Satellite to see your roof. If you are at the business
                right now, press &ldquo;Use my current location&rdquo;.
              </span>
              <div style={{ marginTop: 8 }}>
                <LocationPicker
                  lat={location.lat}
                  lng={location.lng}
                  searchHint={`${form.businessName} ${form.address}`.trim()}
                  allowGps
                  onChange={(p) =>
                    setLocation({ lat: p.lat, lng: p.lng, method: p.method, accuracyM: p.method === "gps" ? p.accuracyM : undefined })
                  }
                />
              </div>
            </div>

            <div className="business-reg-input-group">
              <label>Business Permit</label>
              <input
                className="business-reg-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setBusinessPermit(e.target.files?.[0] ?? null)}
                disabled={submitting}
              />
              {businessPermit && <span className="business-reg-hint">{businessPermit.name}</span>}
            </div>

            <div className="business-reg-input-group">
              <label>DTI / SEC Registration</label>
              <input
                className="business-reg-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setDti(e.target.files?.[0] ?? null)}
                disabled={submitting}
              />
              {dti && <span className="business-reg-hint">{dti.name}</span>}
            </div>

            <div className="business-reg-input-group">
              <label>Barangay Clearance</label>
              <input
                className="business-reg-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setBarangayClearance(e.target.files?.[0] ?? null)}
                disabled={submitting}
              />
              {barangayClearance && (
                <span className="business-reg-hint">{barangayClearance.name}</span>
              )}
            </div>

            <div className="business-reg-input-group">
              <label>Barangay Certification</label>
              <input
                className="business-reg-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setBarangayCertification(e.target.files?.[0] ?? null)}
                disabled={submitting}
              />
              {barangayCertification && (
                <span className="business-reg-hint">{barangayCertification.name}</span>
              )}
            </div>

            <div className="business-reg-input-group">
              <label>Cedula</label>
              <input
                className="business-reg-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setCedula(e.target.files?.[0] ?? null)}
                disabled={submitting}
              />
              {cedula && <span className="business-reg-hint">{cedula.name}</span>}
            </div>

            <div className="business-reg-input-group">
              <label>Business Pictures (up to {MAX_BUSINESS_PICTURES})</label>
              <span className="business-reg-hint">
                Photos of your storefront, stall, or workplace. Hold Ctrl (or Shift) to select
                multiple photos at once — or add them one at a time, they&apos;ll all be kept.
              </span>
              <input
                ref={picInputRef}
                className="business-reg-file-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handlePicFiles}
                disabled={submitting || businessPictures.length >= MAX_BUSINESS_PICTURES}
              />
              {businessPictures.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                  {businessPictures.map((p, idx) => (
                    <div key={p.previewUrl} style={{ position: "relative", width: 90 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.previewUrl}
                        alt={p.file.name}
                        style={{
                          width: 90,
                          height: 90,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #dce8e0",
                          display: "block",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePic(idx)}
                        disabled={submitting}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          background: "#e74c3c",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          fontSize: 12,
                          cursor: "pointer",
                          lineHeight: "20px",
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                className="business-reg-submit-btn"
                style={{ background: "#888" }}
                onClick={handleBack}
                disabled={submitting}
              >
                <i className="fas fa-arrow-left" /> Back
              </button>
              <button type="submit" className="business-reg-submit-btn" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="business-reg-spinner" /> {progressLabel || "Submitting..."}
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane" /> Submit for Approval
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}