import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export type NotifTarget = 'citizen' | 'rescue' | 'all';
export type NotifType = 'general' | 'status_update' | 'alert';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  sentBy: string;
  sentByName: string;
  sentByRole: 'admin' | 'rescue';
  targetRole: NotifTarget;
  createdAt: any;
  deletedBy: string[];
}

/** Send a notification. Admin can target any role. Rescue can only target 'citizen'. */
export async function sendNotification(
  title: string,
  message: string,
  targetRole: NotifTarget,
  type: NotifType = 'general'
): Promise<void> {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Fetch sender name from Firestore users doc
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'users', user.uid));
  const senderName = snap.exists() ? snap.data().name : 'Unknown';
  const senderRole = snap.exists() ? snap.data().role : 'rescue';

  await addDoc(collection(db, 'notifications'), {
    title: title.trim(),
    message: message.trim(),
    type,
    sentBy: user.uid,
    sentByName: senderName,
    sentByRole: senderRole,
    targetRole,
    createdAt: serverTimestamp(),
    deletedBy: [],
  });
}

/** Subscribe to notifications visible to a given role, excluding ones the user deleted. */
export function subscribeToNotifications(
  userRole: 'citizen' | 'rescue' | 'admin',
  uid: string,
  callback: (notifications: Notification[]) => void
) {
  const db = getFirestore();

  // Citizens see: targetRole='citizen' or targetRole='all'
  // Rescue sees: targetRole='rescue' or targetRole='all'
  // Admin sees: all notifications
  let q;
  if (userRole === 'admin') {
    q = query(collection(db, 'notifications'));
  } else if (userRole === 'citizen') {
    q = query(
      collection(db, 'notifications'),
      where('targetRole', 'in', ['citizen', 'all'])
    );
  } else {
    q = query(
      collection(db, 'notifications'),
      where('targetRole', 'in', ['rescue', 'all'])
    );
  }

  return onSnapshot(q, snap => {
    const notifs: Notification[] = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Notification))
      .filter(n => !n.deletedBy?.includes(uid)) // hide ones this user deleted
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    callback(notifs);
  });
}

/** Mark a single notification as deleted for this user (soft delete). */
export async function deleteNotificationForUser(notifId: string, uid: string): Promise<void> {
  const db = getFirestore();
  await updateDoc(doc(db, 'notifications', notifId), {
    deletedBy: arrayUnion(uid),
  });
}

/** Clear ALL notifications for this user (soft delete all). */
export async function clearAllNotificationsForUser(
  userRole: 'citizen' | 'rescue' | 'admin',
  uid: string
): Promise<void> {
  const db = getFirestore();
  let q;
  if (userRole === 'admin') {
    q = query(collection(db, 'notifications'));
  } else if (userRole === 'citizen') {
    q = query(collection(db, 'notifications'), where('targetRole', 'in', ['citizen', 'all']));
  } else {
    q = query(collection(db, 'notifications'), where('targetRole', 'in', ['rescue', 'all']));
  }
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    batch.update(d.ref, { deletedBy: arrayUnion(uid) });
  });
  await batch.commit();
}
