import { getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit as firestoreLimit, writeBatch, collection } from "firebase/firestore";
import { auth, db } from '../lib/firebaseConfig';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

export { auth, db };

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
      // [CVE-5 Fixed] Tidak ada localStorage token yang perlu dihapus
    },
    waitForAuth: () => {
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
          unsubscribe();
          resolve(user);
        });
      });
    }
  },

  MODELS: {
    FAST: "gemini-2.0-flash",
    DEEP: "gemini-2.0-pro",
    VISION: "gemini-2.0-pro-vision"
  },

  entities: {
    Transaction: createFirebaseEntity('transactions'),
    Account: createFirebaseEntity('accounts'),
    Business: createFirebaseEntity('businesses'),
    JournalEntry: createFirebaseEntity('journal_entries'),
    FixedAsset: createFirebaseEntity('fixed_assets'),
    PeriodClosing: createFirebaseEntity('period_closings'),
    PurchaseOrder: createFirebaseEntity('purchase_orders'),
    AuditLog: createFirebaseEntity('audit_logs'),
  }
};

function createFirebaseEntity(tableName) {
  const colRef = collection(db, tableName);

  // [CVE-3 Helper] Ambil user yang sedang login dengan aman
  async function getCurrentUser() {
    let user = auth.currentUser;
    if (!user) user = await GoogleGenerativeAI.auth.waitForAuth();
    if (!user) throw new Error('Tidak ada sesi login aktif.');
    return user;
  }

  return {
    filter: async (criteria = {}, sort = '-created_at', limitNum = 100) => {
      const user = await getCurrentUser();

      const constraints = [where('user_id', '==', user.uid)];
      
      Object.entries(criteria).forEach(([key, value]) => {
        if (key !== 'user_id') { // Cegah override user_id dari luar
          constraints.push(where(key, '==', value));
        }
      });

      if (limitNum) constraints.push(firestoreLimit(limitNum));

      const finalQuery = query(colRef, ...constraints);
      const snapshot = await getDocs(finalQuery);
      let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      if (sort) {
        const isDesc = sort.startsWith('-');
        const column = isDesc ? sort.substring(1) : sort;
        results.sort((a, b) => {
          if (a[column] < b[column]) return isDesc ? 1 : -1;
          if (a[column] > b[column]) return isDesc ? -1 : 1;
          return 0;
        });
      }

      return results;
    },

    list: async (sort = '-created_at', limitNum = 100) => {
      const user = await getCurrentUser();

      const constraints = [where('user_id', '==', user.uid)];
      if (limitNum) constraints.push(firestoreLimit(limitNum));
      
      const finalQuery = query(colRef, ...constraints);
      const snapshot = await getDocs(finalQuery);
      let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      if (sort) {
        const isDesc = sort.startsWith('-');
        const column = isDesc ? sort.substring(1) : sort;
        results.sort((a, b) => {
          if (a[column] < b[column]) return isDesc ? 1 : -1;
          if (a[column] > b[column]) return isDesc ? -1 : 1;
          return 0;
        });
      }

      return results;
    },

    // [CVE-3 Fixed by Herta] — Ownership check pada get()
    get: async (id) => {
      const user = await getCurrentUser();
      const docRef = doc(db, tableName, id);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) throw new Error('Dokumen tidak ditemukan.');

      const data = snapshot.data();

      // IDOR Prevention: Pastikan dokumen ini milik user yang sedang login
      if (data.user_id && data.user_id !== user.uid) {
        // Jangan bocorkan info bahwa dokumen ada — samakan response dengan "not found"
        throw new Error('Dokumen tidak ditemukan.');
      }

      return { id: snapshot.id, ...data };
    },

    create: async (payload) => {
      const user = await getCurrentUser();

      const dataToSave = {
        ...payload,
        user_id: user.uid, // Selalu override dengan user yang login — tidak bisa dimanipulasi
        created_at: payload.created_at || new Date().toISOString()
      };
      
      const docRef = await addDoc(colRef, dataToSave);
      return { id: docRef.id, ...dataToSave };
    },

    // [CVE-3 Fixed by Herta] — Ownership check pada update()
    update: async (id, payload) => {
      const user = await getCurrentUser();
      const docRef = doc(db, tableName, id);

      // Ambil dulu untuk verifikasi kepemilikan
      const existing = await getDoc(docRef);
      if (!existing.exists()) throw new Error('Dokumen tidak ditemukan.');

      const existingData = existing.data();
      if (existingData.user_id && existingData.user_id !== user.uid) {
        throw new Error('Dokumen tidak ditemukan.'); // Jangan bocorkan info eksistensi
      }

      // Pastikan user_id tidak bisa diubah lewat payload
      const { user_id, ...safePayload } = payload;

      await updateDoc(docRef, safePayload);
      const updatedSnapshot = await getDoc(docRef);
      return { id: updatedSnapshot.id, ...updatedSnapshot.data() };
    },

    // [CVE-3 Fixed by Herta] — Ownership check pada delete()
    delete: async (id) => {
      const user = await getCurrentUser();
      const docRef = doc(db, tableName, id);

      // Ambil dulu untuk verifikasi kepemilikan
      const existing = await getDoc(docRef);
      if (!existing.exists()) throw new Error('Dokumen tidak ditemukan.');

      const existingData = existing.data();
      if (existingData.user_id && existingData.user_id !== user.uid) {
        throw new Error('Dokumen tidak ditemukan.'); // Jangan bocorkan info eksistensi
      }

      await deleteDoc(docRef);
      return true;
    },

    bulkCreate: async (items) => {
      const user = await getCurrentUser();
      const batch = writeBatch(db);
      const createdItems = [];
      
      items.forEach(item => {
        const newDocRef = doc(collection(db, tableName));
        const dataToSave = {
          ...item,
          user_id: user.uid, // Selalu override — tidak bisa dimanipulasi
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
