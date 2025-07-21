
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCYQEcRkrOLdTfUl9UTLJ4PwhcbtEfh8Dc",
  authDomain: "memory-b82c3.firebaseapp.com",
  projectId: "memory-b82c3",
  storageBucket: "memory-b82c3.firebasestorage.app",
  messagingSenderId: "734900593495",
  appId: "1:734900593495:web:831be10f43962bcb27d412",
  measurementId: "G-90D1QT8C4W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics
export const analytics = getAnalytics(app);

// Initialize Firestore and get a reference to the service
export const db = getFirestore(app);

console.log("Firebase app, Authentication, Analytics, and Firestore initialized successfully!");

export default app;
