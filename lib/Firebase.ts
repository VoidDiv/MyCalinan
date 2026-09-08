"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
apiKey: "AIzaSyBu_HalimbawaLangIto_M2y4", 
authDomain: "mycalinan.firebaseapp.com",
projectId: "mycalinan",
storageBucket: "mycalinan.appspot.com",
messagingSenderId: "123456789012",
appId: "1:123456789012:web:abc123def456"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);