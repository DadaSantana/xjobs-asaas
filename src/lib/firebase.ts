// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCDWw0VyKci4dUYC48fMSxqqvRSCS3uzgo",
  authDomain: "xjobs-a43d2.firebaseapp.com",
  projectId: "xjobs-a43d2",
  storageBucket: "xjobs-a43d2.firebasestorage.app",
  messagingSenderId: "879576784079",
  appId: "1:879576784079:web:de082a5439788f0d16ebba",
  measurementId: "G-NLE8B8EE2X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

// Initialize Firebase Functions and get a reference to the service
export const functions = getFunctions(app, 'us-central1');

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;
