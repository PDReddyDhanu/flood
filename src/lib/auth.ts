import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

export type UserRole = 'citizen' | 'rescue' | 'admin';
export type RescueStatus = 'pending' | 'approved' | 'rejected';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | RescueStatus;
  phone?: string;
  address?: string;
  teamName?: string;
  createdAt: any;
}

/**
 * Sign in with email and password.
 * Returns the Firebase UserCredential.
 */
export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  const auth = getAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Register a new Citizen account.
 * Creates Firebase Auth user and Firestore user document.
 */
export async function signUpCitizen(
  email: string,
  password: string,
  name: string,
  phone: string,
  address: string
): Promise<UserCredential> {
  const auth = getAuth();
  const db = getFirestore();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;

  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    name,
    role: 'citizen',
    status: 'active',
    phone,
    address,
    createdAt: serverTimestamp(),
  } satisfies Omit<UserData, 'createdAt'> & { createdAt: any });

  return credential;
}

/**
 * Register a new Rescue Team member.
 * Creates Firebase Auth user and Firestore user document with status: 'pending'.
 * Admin must approve before they can log in.
 */
export async function signUpRescue(
  email: string,
  password: string,
  name: string,
  phone: string,
  teamName: string
): Promise<UserCredential> {
  const auth = getAuth();
  const db = getFirestore();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;

  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    name,
    role: 'rescue',
    status: 'pending',
    phone,
    teamName,
    createdAt: serverTimestamp(),
  });

  // Sign out immediately after registration — must wait for admin approval
  await signOut(auth);

  return credential;
}

/**
 * Send a password reset email.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getAuth();
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign out the current user.
 */
export async function firebaseSignOut(): Promise<void> {
  const auth = getAuth();
  await signOut(auth);
}

/**
 * Get user data from Firestore by UID.
 */
export async function getUserData(uid: string): Promise<UserData | null> {
  const db = getFirestore();
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return snap.data() as UserData;
  return null;
}

/**
 * Ensure the admin user document exists in Firestore.
 * Called after admin logs in — creates/updates the Firestore doc if missing.
 * Also writes a marker to /admins/{uid} which is used by Firestore security
 * rules (avoids circular get() on the users collection for isAdmin() checks).
 */
export async function ensureAdminDocument(uid: string, email: string): Promise<void> {
  const db = getFirestore();
  const userRef = doc(db, 'users', uid);
  const adminMarkerRef = doc(db, 'admins', uid);

  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid,
      email,
      name: 'Admin',
      role: 'admin',
      status: 'active',
      createdAt: serverTimestamp(),
    });
  }

  // Write the admin marker doc (used by Firestore rules for isAdmin() check)
  const markerSnap = await getDoc(adminMarkerRef);
  if (!markerSnap.exists()) {
    await setDoc(adminMarkerRef, { uid, createdAt: serverTimestamp() });
  }
}
