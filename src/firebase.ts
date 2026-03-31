import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Import the Firebase configuration from the auto-generated config file
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use the specific firestoreDatabaseId if provided in the config
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};
