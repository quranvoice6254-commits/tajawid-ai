import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

import config from "../../firebase-applet-config.json";

// Safe loading of applet config
let firebaseConfig: any = null;
let isFirebaseReady = false;

if (config && config.apiKey && config.apiKey !== "YOUR_API_KEY") {
  firebaseConfig = config;
  isFirebaseReady = true;
}

// Global instances
let appInstance: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let storageInstance: any = null;

if (isFirebaseReady && firebaseConfig) {
  try {
    appInstance = initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    // Explicitly pass the firestoreDatabaseId if configured
    dbInstance = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
    storageInstance = getStorage(appInstance);
    console.log("Firebase initialized successfully in online cloud mode.");
  } catch (error) {
    console.error("Failed to initialize Firebase with configured JSON:", error);
    isFirebaseReady = false;
  }
}

// Local persistence simulation engine if firebase is absent (Requirement 8, 9, 10, 11)
class MockAuth {
  private listeners: Array<(user: any) => void> = [];
  private currentUser: any = null;

  constructor() {
    // Load local persistent user state
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tajaweed_mock_user");
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch (_) {}
      }
    }
  }

  get auth() {
    return this;
  }
  get currentUserState() {
    return this.currentUser;
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private triggerChange() {
    localStorage.setItem(
      "tajaweed_mock_user",
      this.currentUser ? JSON.stringify(this.currentUser) : "",
    );
    this.listeners.forEach((l) => l(this.currentUser));
  }

  async signInWithEmailAndPassword(email: string, pass: string) {
    // Fake login
    this.currentUser = {
      uid: "local-user-123",
      email: email,
      displayName: email.split("@")[0],
      photoURL: "",
      emailVerified: true,
    };
    this.triggerChange();
    return { user: this.currentUser };
  }

  async createUserWithEmailAndPassword(email: string, pass: string) {
    this.currentUser = {
      uid: "local-user-123",
      email: email,
      displayName: email.split("@")[0],
      photoURL: "",
      emailVerified: true,
    };
    this.triggerChange();
    return { user: this.currentUser };
  }

  async signInWithPopup() {
    this.currentUser = {
      uid: "local-user-google",
      email: "quranvoice6254@gmail.com",
      displayName: "قارئ تجاويد",
      photoURL: "",
      emailVerified: true,
    };
    this.triggerChange();
    return { user: this.currentUser };
  }

  async signInWithPhoneNumber(phoneNumber: string, appVerifier: any) {
    return {
      confirm: async (code: string) => {
        if (code === "123456") {
          this.currentUser = {
            uid: "local-user-phone",
            email: "phone@tajweed.app",
            phoneNumber: phoneNumber,
            displayName: "مستخدم هاتف",
            photoURL: "",
            emailVerified: true,
          };
          this.triggerChange();
          return { user: this.currentUser };
        }
        throw new Error("رمز التحقق غير صحيح");
      }
    };
  }

  async signOut() {
    this.currentUser = null;
    this.triggerChange();
  }

  async sendPasswordResetEmail(email: string) {
    console.log(`Mock reset email sent to: ${email}`);
  }

  async updateProfile(updates: { displayName?: string; photoURL?: string }) {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...updates };
      this.triggerChange();
    }
  }
}

class MockFirestore {
  private loadData(collectionName: string): any[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(`tajaweed_db_${collectionName}`);
    return raw ? JSON.parse(raw) : [];
  }

  private saveData(collectionName: string, data: any[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(`tajaweed_db_${collectionName}`, JSON.stringify(data));
  }

  async addDocument(collectionName: string, payload: any) {
    const list = this.loadData(collectionName);
    const docId = Math.random().toString(36).substring(3, 11);
    const newDoc = {
      id: docId,
      ...payload,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newDoc);
    this.saveData(collectionName, list);
    return newDoc;
  }

  async setDocument(collectionName: string, docId: string, payload: any) {
    const list = this.loadData(collectionName);
    const filtered = list.filter((d) => d.id !== docId);
    filtered.push({
      id: docId,
      ...payload,
      updatedAt: new Date().toISOString(),
    });
    this.saveData(collectionName, filtered);
  }

  async getDocument(collectionName: string, docId: string) {
    const list = this.loadData(collectionName);
    return list.find((d) => d.id === docId) || null;
  }

  async getCollection(collectionName: string) {
    return this.loadData(collectionName);
  }

  async queryCollection(
    collectionName: string,
    field: string,
    operator: string,
    value: any,
  ) {
    const list = this.loadData(collectionName);
    return list.filter((item) => {
      if (operator === "==") return item[field] === value;
      return true;
    });
  }
}

export const mockAuth = new MockAuth();
export const mockDb = new MockFirestore();

// Standard handle function to avoid unhandled permission issues
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: isFirebaseReady ? authInstance?.currentUser?.uid : "local",
      email: isFirebaseReady ? authInstance?.currentUser?.email : "local",
    },
    operationType,
    path,
  };
  console.error("Firestore Hardened Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Unified API exports (falls back to local simulator cleanly)
export const db = dbInstance;
export const auth = authInstance;
export const storage = storageInstance;
export { isFirebaseReady };
