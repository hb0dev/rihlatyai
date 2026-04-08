import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  signOut,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
  deleteUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
export interface UserData {
  uid: string;
  email: string;
  fullName: string;
  photoURL?: string;
  language: string;
  createdAt: Date;
}
interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const isNativePlatform = () => {
  try {
    return typeof (window as any).Capacitor !== 'undefined' && 
           (window as any).Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const isNative = isNativePlatform();
  useEffect(() => {
    if (isNative) {
      import('@codetrix-studio/capacitor-google-auth').then(({ GoogleAuth }) => {
        GoogleAuth.initialize({
          clientId: '791203311254-d189riqar57nu2o34k8b5elp51gof7l1.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true
        });
      }).catch(err => {
        console.log('GoogleAuth init error:', err);
      });
    }
  }, [isNative]);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Create or update user in Firestore
  const createOrUpdateUser = async (firebaseUser: User, additionalData?: { name?: string; imageUrl?: string }) => {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      const newUserData: UserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        fullName: firebaseUser.displayName || additionalData?.name || '',
        photoURL: firebaseUser.photoURL || additionalData?.imageUrl || '',
        language: 'ar',
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
      setUserData(newUserData);
    } else {
      setUserData(userDoc.data() as UserData);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      if (isNative) {
        // Native platform - use Capacitor Google Auth
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        const googleUser = await GoogleAuth.signIn();
        
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        
        await createOrUpdateUser(userCredential.user, {
          name: googleUser.name,
          imageUrl: googleUser.imageUrl
        });
      } else {
        // Web platform - use Firebase popup
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        const userCredential = await signInWithPopup(auth, provider);
        await createOrUpdateUser(userCredential.user);
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    if (isNative) {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.signOut();
      } catch (e) {
        // Ignore if not signed in with Google
      }
    }
    await signOut(auth);
    setUserData(null);
  };

  // Update user profile
  const updateUserProfile = async (data: Partial<UserData>) => {
    if (!user) throw new Error('No user logged in');

    await updateDoc(doc(db, 'users', user.uid), data);
    setUserData(prev => prev ? { ...prev, ...data } : null);
  };

  // Delete user account
  const deleteAccount = async () => {
    if (!user) throw new Error('No user logged in');

    try {
      if (isNative) {
        try {
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
          const googleUser = await GoogleAuth.signIn();
          const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
          await signInWithCredential(auth, credential);
        } catch (e) {
          console.error('Re-authentication failed:', e);
          throw new Error('Re-authentication required');
        }
      }

      // Delete user's conversations subcollection
      const conversationsRef = collection(db, 'users', user.uid, 'conversations');
      const conversationsSnapshot = await getDocs(conversationsRef);
      const deletePromises = conversationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', user.uid));

      // Sign out from Google if on native platform
      if (isNative) {
        try {
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
          await GoogleAuth.signOut();
        } catch (e) {
          // Ignore if not signed in with Google
        }
      }

      // Delete Firebase Auth user
      await deleteUser(user);
      
      setUserData(null);
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      loading,
      signInWithGoogle,
      logout,
      updateUserProfile,
      deleteAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
