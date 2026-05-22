// Firebase Firestore integration.
// Loads state from the cloud on startup; saves on every state change.
// All failures are non-fatal — localStorage is the offline fallback.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDgzgMjVZpkkIUwxY9JHf7kicxi7BBaBjs",
  authDomain:        "divna-character-sheet.firebaseapp.com",
  projectId:         "divna-character-sheet",
  storageBucket:     "divna-character-sheet.firebasestorage.app",
  messagingSenderId: "826261232996",
  appId:             "1:826261232996:web:9c2a29dfd7ffb93131ee71",
  measurementId:     "G-C5NZ87PJPF",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Single document that holds the full character state.
const CHAR_DOC = doc(db, "characters", "divna");

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/**
 * Fetches the character state from Firestore.
 * Returns the plain state object, or null if the document doesn't exist
 * or the network is unavailable.
 */
export async function loadFromFirestore() {
  try {
    const snap = await getDoc(CHAR_DOC);
    if (snap.exists()) {
      console.info("[Firebase] Loaded state from Firestore.");
      return snap.data();
    }
    console.info("[Firebase] No cloud save found — using local state.");
    return null;
  } catch (err) {
    console.warn("[Firebase] Load failed, falling back to localStorage.", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

/**
 * Persists the current state to Firestore.
 * Fire-and-forget — never blocks the UI.
 * Sanitises the object through JSON so Firestore never sees `undefined`.
 */
export async function saveToFirestore(stateData) {
  try {
    const clean = JSON.parse(JSON.stringify(stateData));
    await setDoc(CHAR_DOC, clean);
  } catch (err) {
    console.warn("[Firebase] Save failed.", err);
  }
}
