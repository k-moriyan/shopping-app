import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBNgs8tgCQwOeg2C6r8Xa2CFZwcu5iWpi0",
    authDomain: "shopping-app-d5d6d.firebaseapp.com",
    databaseURL: "https://shopping-app-d5d6d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "shopping-app-d5d6d",
    storageBucket: "shopping-app-d5d6d.firebasestorage.app",
    messagingSenderId: "1034969080064",
    appId: "1:1034969080064:web:fac15c950ee697f2f413e5"
  };

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
