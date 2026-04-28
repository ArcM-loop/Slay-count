import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit as firestoreLimit, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBjVZRY_nwKlPghsDkCdfgHuL1B37jnh1g",
  authDomain: "accountomation.firebaseapp.com",
  projectId: "accountomation",
  storageBucket: "accountomation.firebasestorage.app",
  messagingSenderId: "825422475013",
  appId: "1:825422475013:web:8cf09b6a53aac97838516c",
  measurementId: "G-6GR6FE8W90"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export const GoogleGenerativeAI = {
  auth: {
    me: async () => {
      return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
          unsubscribe();
          if (user) resolve(user);
          else reject(new Error('Not authenticated'));
        });
      });
    },
    login: async (email, password) => {
      return await signInWithEmailAndPassword(auth, email, password);
    },
    loginWithGoogle: async () => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        return { data: result.user, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    logout: async () => {
      await signOut(auth);
      localStorage.removeItem('slaycount_session_token');
    }
  },

  entities: {
    Transaction: createFirebaseEntity('transactions'),
    Account: createFirebaseEntity('accounts'),
    Business: createFirebaseEntity('businesses'),
    JournalEntry: createFirebaseEntity('journal_entries'),
    FixedAsset: createFirebaseEntity('fixed_assets'),
    PeriodClosing: createFirebaseEntity('period_closings'),
  }
};

function createFirebaseEntity(tableName) {
  const colRef = collection(db, tableName);
  return {
    filter: async (criteria = {}, sort = '-created_at', limitNum = 100) => {
      const constraints = [];
      
      Object.entries(criteria).forEach(([key, value]) => {
        constraints.push(where(key, '==', value));
      });

      if (sort) {
        const isDesc = sort.startsWith('-');
        const column = isDesc ? sort.substring(1) : sort;
        constraints.push(orderBy(column, isDesc ? 'desc' : 'asc'));
      }

      if (limitNum) {
        constraints.push(firestoreLimit(limitNum));
      }

      const finalQuery = query(colRef, ...constraints);
      const snapshot = await getDocs(finalQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    get: async (id) => {
      const docRef = doc(db, tableName, id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) throw new Error('Document not found');
      return { id: snapshot.id, ...snapshot.data() };
    },

    create: async (payload) => {
      const dataToSave = {
        ...payload,
        created_at: payload.created_at || new Date().toISOString()
      };
      
      const docRef = await addDoc(colRef, dataToSave);
      return { id: docRef.id, ...dataToSave };
    },

    update: async (id, payload) => {
      const docRef = doc(db, tableName, id);
      await updateDoc(docRef, payload);
      const updatedSnapshot = await getDoc(docRef);
      return { id: updatedSnapshot.id, ...updatedSnapshot.data() };
    },

    delete: async (id) => {
      const docRef = doc(db, tableName, id);
      await deleteDoc(docRef);
      return true;
    },

    bulkCreate: async (items) => {
      const batch = writeBatch(db);
      const createdItems = [];
      
      items.forEach(item => {
        const newDocRef = doc(collection(db, tableName));
        const dataToSave = {
          ...item,
          created_at: item.created_at || new Date().toISOString()
        };
        batch.set(newDocRef, dataToSave);
        createdItems.push({ id: newDocRef.id, ...dataToSave });
      });
      
      await batch.commit();
      return createdItems;
    }
  };
}
