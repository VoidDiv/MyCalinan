/* ============================================================
   FILE: lib/barangayOfficials.ts   (NEW)
   Single source of truth for Barangay Calinan Poblacion officials.
   Imported by components/BarangayOfficials.tsx AND lib/calibotKnowledge.ts.
   No "use client" here on purpose, so server routes can import it.
   ============================================================ */

export type Committee = {
  name: string;
  members: string[];
};

export type BacMember = {
  role: string;
  name: string;
};

export type Official = {
  name: string;
  position: string;
  photo?: string;
  committees?: Committee[];
  bac?: BacMember[];
  term?: string;
  office?: string;
  about?: string;
};

export const BARANGAY_NAME = "Barangay Calinan Poblacion";

const PHOTO_BASE =
  "https://firebasestorage.googleapis.com/v0/b/mycalinan.firebasestorage.app/o/BarangayOfficials%2F";

export const CAPTAIN: Official | null = {
  name: "Pedrito C. Angco",
  position: "Punong Barangay",
  photo: `${PHOTO_BASE}Pedrito%20C.%20Angco-Punong%20Barangay.jpg?alt=media&token=ffd91fb8-052f-45fc-81e8-06c3c90e2a82`,
};

export const KAGAWADS: Official[] = [
  {
    name: "Mary Ann Theresa S. Lee",
    position: "Barangay Kagawad",
    photo: `${PHOTO_BASE}Mary%20Ann%20Theresa%20S.%20Lee-Barangay%20Kagawad.jpg?alt=media&token=b79b314e-0693-484b-9e79-7d05b590e78a`,
    committees: [
      { name: "Finance, Ways and Means", members: ["Pepito", "Junsay"] },
      { name: "Women and Children's Welfare", members: ["Junsay", "Camelotes"] },
      { name: "Health and Sanitation", members: ["Pepito", "Fermendoza"] },
      { name: "Bids and Awards", members: ["Pepito", "Junsay"] },
    ],
    bac: [
      { role: "Chair", name: "SB Mem Mary Ann Theresa S. Lee" },
      { role: "Vice Chair", name: "SB Mem Geomarey P. Pepito" },
      { role: "Secretary", name: "SB Mem Noel P. Fermendoza" },
      { role: "Member", name: "SB Mem Leonardo G. Camelotes" },
      { role: "Member", name: "SB Mem Joel V. Junsay" },
    ],
  },
  {
    name: "Leonardo G. Camelotes",
    position: "Barangay Kagawad",
    photo: `${PHOTO_BASE}Leonardo%20G.%20Camelotes-Barangay%20Kagawad.jpg?alt=media&token=2877d8a8-7ece-49bf-9b82-7dded5449e26`,
    committees: [
      {
        name: "Infrastructure Maintenance and Improvement of Government Structures and Roads",
        members: ["Fermendoza", "Lee"],
      },
      { name: "Street Lights and Water Resources", members: ["Fermendoza", "Junsay"] },
    ],
  },
  {
    name: "Geomarey P. Pepito",
    position: "Barangay Kagawad",
    photo: `${PHOTO_BASE}Geomarey%20P.%20Pepito-Barangay%20Kagawad.jpg?alt=media&token=b5746f12-0a65-45f6-a2d1-16bcc3f15b29`,
    committees: [
      { name: "Education & Human Resource Development", members: ["Lee", "Junsay"] },
      { name: "Tourism and Beautification", members: ["Lee", "Camelotes"] },
    ],
  },
  {
    name: "Noel P. Fermendoza",
    position: "Barangay Kagawad",
    photo: `${PHOTO_BASE}Noel%20P.%20Fermendoza-Barangay%20Kagawad.jpg?alt=media&token=35405fab-ca46-4615-ba2b-cdd13fdffe52`,
    committees: [
      { name: "Agriculture and Irrigation Facilities", members: ["Camelotes", "Junsay"] },
      { name: "Trade and Industry", members: ["Lee", "Camelotes"] },
      { name: "Cooperative and Non-Government Organizations", members: ["Camelotes", "Pepito"] },
      { name: "Environmental Protection and Solid Waste", members: ["Camelotes", "Junsay"] },
    ],
  },
  {
    name: "Joel V. Junsay",
    position: "Barangay Kagawad",
    photo: `${PHOTO_BASE}Joel%20V.%20Junsay-Barangay%20Kagawad.jpg?alt=media&token=a5a5854f-0bf6-4c60-ad91-9fb88006456d`,
    committees: [
      { name: "Purok Affairs", members: ["Fermendoza", "Lee"] },
      { name: "Social Services, Elderly and PWD, and Inter-Faith", members: ["Fermendoza", "Lee"] },
      { name: "Rules and Ethics, Laws and Ordinances", members: ["Fermendoza", "Simangan", "Lee"] },
    ],
  },
  {
    name: "Allan John S. Simangan",
    position: "Barangay Kagawad",
    photo: `${PHOTO_BASE}Allan%20John%20S.%20Simangan-Barangay%20Kagawad.jpg?alt=media&token=f45b9697-42e0-498a-97a6-4e5aee9efa6d`,
    committees: [
      { name: "Public Order, Peace and Safety", members: ["Pepito", "Junsay"] },
      { name: "Games and Amusement", members: ["Pepito", "Junsay"] },
      { name: "LGBTQ", members: ["Lee", "Camelotes"] },
      { name: "Public Transport and Terminal Planning", members: ["Pepito", "Junsay"] },
    ],
  },
];

export const STAFF: Official[] = [
  {
    name: "Golda Mier D. Cajes",
    position: "Barangay Secretary",
    photo: `${PHOTO_BASE}Golda%20Mier%20D.%20Cajes-Barangay%20Secretary.jpg?alt=media&token=3ea60380-f8a1-4702-b9c3-f4c2014f518b`,
  },
  {
    name: "Jimmy P. Janiola",
    position: "Barangay Treasurer",
    photo: `${PHOTO_BASE}Jimmy%20P.%20Janiola-Barangay%20Treasurer.jpg?alt=media&token=85e1db44-4340-4a4b-8b78-f58c5638ee1e`,
  },
];

export const SECTORAL: Official[] = [
  {
    name: "Mahali Albin G. Sicat",
    position: "SK Chairman",
    photo: `${PHOTO_BASE}Mahali%20Albin%20G.%20Sicat-SK%20Chairman.jpg?alt=media&token=d41617c7-3ae7-476f-81ef-a0c0cb22c147`,
    committees: [
      { name: "Youth Welfare and Sports Development", members: ["Lee", "Junsay"] },
    ],
  },
  {
    name: "Mariano L. Monoy Jr.",
    position: "IPMR",
    photo: `${PHOTO_BASE}Mariano%20L.%20Monoy%20JR-IPMR.jpg?alt=media&token=52aabab7-dfa5-4a7a-b86d-e15de1049058`,
    committees: [
      { name: "Indigenous People's Welfare", members: ["Junsay", "Pepito"] },
      { name: "Disaster Risk Reduction Management", members: ["Fermendoza", "Sicat"] },
    ],
  },
];