// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage"; // No longer needed

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
  apiKey: "AIzaSyDRB8QLQfUh95U8P71oRVmkqNoC8mYqdPc",
  authDomain: "loyalfly-share.firebaseapp.com",
  projectId: "loyalfly-share",
  storageBucket: "loyalfly-share.appspot.com",
  messagingSenderId: "985264381901",
  appId: "1:985264381901:web:6f00a982d9e89064cf2e84",
  measurementId: "G-JQ7MW7LHRY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get references to the services
const db = getFirestore(app);
// const storage = getStorage(app); // No longer needed

export { db }; // Export only db
