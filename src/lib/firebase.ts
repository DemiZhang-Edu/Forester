import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, Timestamp } from 'firebase/firestore';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// @ts-ignore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    await updateProfile(user, { displayName });
    
    // Explicitly create firestore document to avoid race condition with onAuthStateChanged
    const userRef = doc(db, 'users', user.uid);
    const isAdmin = email === 'demizy2024@gmail.com';
    await setDoc(userRef, {
      uid: user.uid,
      displayName: displayName,
      email: email,
      photoURL: '',
      badges: [],
      postsCount: 0,
      xp: 0,
      isAdmin: isAdmin,
      createdAt: Timestamp.now(),
    });

    await sendEmailVerification(user);
    return user;
  } catch (error: any) {
    console.error('Sign up failed:', error);
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}

// Test connection
async function testConnection() {
  if (!firebaseConfig.apiKey) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
