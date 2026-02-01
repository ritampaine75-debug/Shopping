import { auth, db } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { ref, set, get } from "firebase/database";

export const registerUser = async (email, password, name) => {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  await set(ref(db, `users/${res.user.uid}`), {
    name,
    email,
    isAdmin: false,
    createdAt: Date.now()
  });
  return res.user;
};

export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);

export const getUserData = async (uid) => {
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.val();
};
