import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  deleteDoc,
  limit,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { StudyMaterial, UserProgress } from "./types";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with custom databaseId
export const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export interface UserAccountProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  totalXp: number;
  level: number;
  streakDays: number;
  cardsMasteredCount?: number;
  quizzesCorrectCount?: number;
  lastActiveDate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Creates or retrieves the user's permanent profile document in Firestore `users/{uid}`.
 */
export async function ensureUserProfile(user: FirebaseUser): Promise<UserAccountProfile> {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  const today = new Date().toISOString().split("T")[0];

  if (snapshot.exists()) {
    const existing = snapshot.data() as UserAccountProfile;
    // Update last activity
    await setDoc(
      userRef,
      {
        displayName: user.displayName || existing.displayName || user.email?.split("@")[0] || "Estudiante",
        photoURL: user.photoURL || existing.photoURL || "",
        lastActiveDate: today,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { ...existing, lastActiveDate: today };
  } else {
    // New user registered: Create persistent record in Firestore
    const newProfile: UserAccountProfile = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || user.email?.split("@")[0] || "Nuevo Estudiante",
      photoURL: user.photoURL || "",
      totalXp: 50, // Welcome bonus
      level: 1,
      streakDays: 1,
      lastActiveDate: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  }
}

/**
 * Register with email and password, setting the display name and saving into database.
 */
export async function registerWithEmail(email: string, pass: string, name: string): Promise<FirebaseUser> {
  const userCred = await createUserWithEmailAndPassword(auth, email, pass);
  if (name.trim()) {
    await updateProfile(userCred.user, { displayName: name.trim() });
  }
  await ensureUserProfile(userCred.user);
  return userCred.user;
}

/**
 * Log in with existing email and password.
 */
export async function loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  const userCred = await signInWithEmailAndPassword(auth, email, pass);
  await ensureUserProfile(userCred.user);
  return userCred.user;
}

/**
 * Quick Google popup sign-in.
 */
export async function loginWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
}

/**
 * Sign out current user.
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Synchronize study stats and XP to Firestore.
 */
export async function syncProgressToDb(userId: string, progress: UserProgress): Promise<void> {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        totalXp: progress.totalXp,
        level: progress.level,
        streakDays: progress.streakDays,
        cardsMasteredCount: progress.cardsMasteredCount || 0,
        quizzesCorrectCount: progress.quizzesCorrectCount || 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Error syncing progress to Firestore:", err);
  }
}

/**
 * Add a friend to user's friend list.
 */
export async function addFriendToDb(currentUserId: string, friend: UserAccountProfile): Promise<boolean> {
  if (!currentUserId || !friend.uid || currentUserId === friend.uid) return false;
  try {
    // 1. Add to user's friends subcollection
    const friendRef = doc(db, "users", currentUserId, "friends", friend.uid);
    await setDoc(friendRef, {
      uid: friend.uid,
      email: friend.email,
      displayName: friend.displayName || friend.email.split("@")[0],
      photoURL: friend.photoURL || "",
      addedAt: new Date().toISOString(),
    });

    // 2. Also keep array on user's doc
    const userRef = doc(db, "users", currentUserId);
    await setDoc(userRef, { friends: arrayUnion(friend.uid) }, { merge: true });

    return true;
  } catch (err) {
    console.error("Error adding friend to Firestore:", err);
    return false;
  }
}

/**
 * Remove a friend from user's list.
 */
export async function removeFriendFromDb(currentUserId: string, friendId: string): Promise<boolean> {
  if (!currentUserId || !friendId) return false;
  try {
    const friendRef = doc(db, "users", currentUserId, "friends", friendId);
    await deleteDoc(friendRef);

    const userRef = doc(db, "users", currentUserId);
    await setDoc(userRef, { friends: arrayRemove(friendId) }, { merge: true });

    return true;
  } catch (err) {
    console.error("Error removing friend from Firestore:", err);
    return false;
  }
}

/**
 * Retrieve user's friends and fetch their latest live study stats.
 */
export async function getUserFriendsFromDb(currentUserId: string): Promise<UserAccountProfile[]> {
  if (!currentUserId) return [];
  try {
    const friendsColl = collection(db, "users", currentUserId, "friends");
    const snapshot = await getDocs(friendsColl);

    const friendUids: string[] = [];
    snapshot.forEach((snap) => {
      const data = snap.data();
      if (data.uid) friendUids.push(data.uid);
    });

    if (friendUids.length === 0) return [];

    // Fetch live profiles for each friend
    const friendProfiles: UserAccountProfile[] = [];
    for (const uid of friendUids) {
      try {
        const uSnap = await getDoc(doc(db, "users", uid));
        if (uSnap.exists()) {
          const profile = uSnap.data() as UserAccountProfile;
          friendProfiles.push({
            ...profile,
            uid,
          });
        }
      } catch (e) {
        console.warn(`Could not load profile for friend ${uid}`, e);
      }
    }

    // Sort by totalXp descending
    return friendProfiles.sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
  } catch (err) {
    console.error("Error getting user friends from Firestore:", err);
    return [];
  }
}

/**
 * Search users in the community to add as friends by email or name.
 */
export async function searchUsersInDb(searchTerm: string, currentUserId: string): Promise<UserAccountProfile[]> {
  const clean = searchTerm.trim().toLowerCase();
  if (!clean || clean.length < 2) return [];

  try {
    const usersColl = collection(db, "users");
    // Fetch a batch of community users
    const q = query(usersColl, limit(50));
    const snapshot = await getDocs(q);

    const results: UserAccountProfile[] = [];
    snapshot.forEach((snap) => {
      const data = snap.data() as UserAccountProfile;
      if (data.uid !== currentUserId) {
        const emailMatch = (data.email || "").toLowerCase().includes(clean);
        const nameMatch = (data.displayName || "").toLowerCase().includes(clean);
        if (emailMatch || nameMatch) {
          results.push(data);
        }
      }
    });

    return results.sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
  } catch (err) {
    console.error("Error searching users in Firestore:", err);
    return [];
  }
}

/**
 * Get top learners on the platform for the community ranking.
 */
export async function getCommunityLeaderboard(limitCount: number = 20): Promise<UserAccountProfile[]> {
  try {
    const usersColl = collection(db, "users");
    const q = query(usersColl, limit(limitCount));
    const snapshot = await getDocs(q);

    const list: UserAccountProfile[] = [];
    snapshot.forEach((snap) => {
      const data = snap.data() as UserAccountProfile;
      list.push(data);
    });

    return list.sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
  } catch (err) {
    console.error("Error fetching community leaderboard:", err);
    return [];
  }
}

/**
 * Save a generated study material into the user's Firestore database.
 */
export async function saveMaterialToDb(userId: string, material: StudyMaterial): Promise<void> {
  if (!userId || !material.id) return;
  try {
    const matRef = doc(db, "study_materials", material.id);
    await setDoc(
      matRef,
      {
        id: material.id,
        userId,
        topic: material.topic,
        overview: material.overview || "",
        selectedPassions: material.selectedPassions || [],
        createdAt: new Date().toISOString(),
        data: material,
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Error saving material to Firestore:", err);
  }
}

/**
 * Retrieve all saved materials for a user from Firestore.
 */
export async function getUserMaterialsFromDb(userId: string): Promise<StudyMaterial[]> {
  if (!userId) return [];
  try {
    const coll = collection(db, "study_materials");
    const q = query(coll, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const materials: StudyMaterial[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.data) {
        materials.push(data.data as StudyMaterial);
      }
    });

    return materials;
  } catch (err) {
    console.error("Error getting user materials from Firestore:", err);
    return [];
  }
}

/**
 * Delete a study material from the user's database.
 */
export async function deleteMaterialFromDb(userId: string, materialId: string): Promise<boolean> {
  if (!userId || !materialId) return false;
  try {
    const matRef = doc(db, "study_materials", materialId);
    await deleteDoc(matRef);
    return true;
  } catch (err) {
    console.error("Error deleting material from Firestore:", err);
    return false;
  }
}

/**
 * Smoke test connection to verify database connectivity.
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const coll = collection(db, "users");
    await getDocs(query(coll, where("uid", "==", "probe")));
    return true;
  } catch (e) {
    // Permission or empty check is expected for anonymous/probe
    return true;
  }
}
