"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAp8AuPjfTaAZH51epl3ZtAPTkqWAbr6s0",
  authDomain: "mycalinan.firebaseapp.com",
  projectId: "mycalinan",
  storageBucket: "mycalinan.firebasestorage.app",
  messagingSenderId: "519302589088",
  appId: "1:519302589088:web:432887b465fb8ceacbb7c5",
  measurementId: "G-QQ3JJR882G"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);