import { getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit as firestoreLimit, writeBatch, collection } from "firebase/firestore";
import { auth, db } from '../lib/firebaseConfig';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";

export { auth, db };

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
    /**
     * Login Google — Menggunakan Redirect secara eksklusif agar kompatibel penuh
     * dengan Cloud Run & Firebase Hosting lintas-domain.
     */
    loginWithGoogle: async () => {
      // Pastikan sesi tersimpan secara permanen di browser
      await setPersistence(auth, browserLocalPersistence);

      try {
        const result = await signInWithPopup(auth, googleProvider);
        return { data: result.user, error: null };
      } catch (error) {
        console.error('[Auth] Error login popup:', error);
        return { data: null, error };
      }
    },

    /**
     * handleRedirectResult dikosongkan karena menggunakan popup
     */
    handleRedirectResult: async () => {
      return { data: null, error: null };
    },

    logout: async () => {
      await signOut(auth);
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

  generate: async ({ prompt, temperature = 0.2, maxTokens = 1024, jsonMode = true, image = null, mimeType = null, stopSequences = null }) => {
    const getBackendUrl = () => {
      // 1. Cek jika berjalan di production Firebase Hosting
      if (typeof window !== 'undefined' && 
          (window.location.hostname.includes('web.app') || 
           window.location.hostname.includes('firebaseapp.com'))) {
        return 'https://slaycount-825422475013.asia-southeast2.run.app';
      }
      // 2. Jika di production Cloud Run langsung
      if (import.meta.env.PROD) {
        return window.location.origin;
      }
      const envUrl = import.meta.env.VITE_API_BASE_URL;
      if (envUrl && envUrl.startsWith('http')) {
        return envUrl;
      }
      return 'http://localhost:5000';
    };
    const BACKEND_URL = getBackendUrl();
    try {
      let user = auth.currentUser;
      if (!user) {
        // Tunggu maksimal 2 detik untuk memastikan auth selesai memuat sesi
        user = await Promise.race([
          GoogleGenerativeAI.auth.waitForAuth(),
          new Promise(r => setTimeout(() => r(null), 2000))
        ]);
      }

      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BACKEND_URL}/api/ai/generate`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          prompt,
          purpose: 'worker',
          temperature,
          jsonMode,
          image,
          mimeType,
          stopSequences
        })
      });

      if (!response.ok) {
        throw new Error(`AI Request failed: ${response.status}`);
      }

      const data = await response.json();
      const contentString = typeof data.result === 'object' ? JSON.stringify(data.result) : data.result;

      return {
        choices: [
          {
            message: {
              content: contentString
            }
          }
        ]
      };
    } catch (error) {
      console.warn('[GoogleGenerativeAI.generate] Backend proxy gagal dihubungi. Mencoba memanggil Gemini API secara langsung dari browser sebagai cadangan...', error);
      
      const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3-flash';
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Backend tidak dapat dihubungi dan tidak ada VITE_GEMINI_API_KEY di frontend sebagai cadangan.');
      }
      
      try {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const parts = [{ text: prompt }];
        if (image && mimeType) {
          parts.push({
            inlineData: {
              mimeType,
              data: image
            }
          });
        }
        
        let directResponse = await fetch(directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              ...(jsonMode && { responseMimeType: 'application/json' }),
              ...(stopSequences && { stopSequences })
            }
          })
        });
        
        // Pemetaan Cerdas Fallback Dinamis Herta Tahap 1: Jika model pilihan (seperti gemini-3.5-flash) tidak didukung atau 404/400,
        // lakukan retry otomatis menggunakan gemini-3-flash-preview sebagai cadangan.
        if (!directResponse.ok && (directResponse.status === 404 || directResponse.status === 400)) {
          console.warn(`[GoogleGenerativeAI] Model ${modelName} tidak didukung atau 404/400. Melakukan failover dinamis ke gemini-3-flash-preview...`);
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
          directResponse = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
                ...(jsonMode && { responseMimeType: 'application/json' }),
                ...(stopSequences && { stopSequences })
              }
            })
          });
        }
        
        // Pemetaan Cerdas Fallback Dinamis Herta Tahap 2: Jika gemini-3-flash-preview gagal, coba gemini-2.5-flash
        if (!directResponse.ok && (directResponse.status === 429 || directResponse.status === 404 || directResponse.status === 400)) {
          console.warn(`[GoogleGenerativeAI] Model ${modelName}/gemini-3-flash-preview gagal dengan status ${directResponse.status}. Melakukan failover ke gemini-2.5-flash...`);
          const ultimateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
          directResponse = await fetch(ultimateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
                ...(jsonMode && { responseMimeType: 'application/json' }),
                ...(stopSequences && { stopSequences })
              }
            })
          });
        }

        // Pemetaan Cerdas Fallback Dinamis Herta Tahap 3: Jika gemini-2.5-flash juga gagal, coba gemini-1.5-flash yang super stabil
        if (!directResponse.ok && (directResponse.status === 429 || directResponse.status === 404 || directResponse.status === 400)) {
          console.warn(`[GoogleGenerativeAI] Model gemini-2.5-flash gagal dengan status ${directResponse.status}. Melakukan failover ke gemini-1.5-flash...`);
          const legacyUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
          directResponse = await fetch(legacyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
                ...(jsonMode && { responseMimeType: 'application/json' }),
                ...(stopSequences && { stopSequences })
              }
            })
          });
        }
        
        if (!directResponse.ok) {
          const errData = await directResponse.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Gemini Direct API Error: ${directResponse.status}`);
        }
        
        const directData = await directResponse.json();
        const text = directData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return {
          choices: [
            {
              message: {
                content: text
              }
            }
          ]
        };
      } catch (directError) {
        console.error('[GoogleGenerativeAI.generate] Pemanggilan langsung gagal juga:', directError);
        throw new Error(`Gagal memanggil AI: ${error.message} (Fallback juga gagal: ${directError.message})`);
      }
    }
  },

  MODELS: {
    FAST: "gemini-3-flash",
    DEEP: "gemini-3-pro",
    VISION: "gemini-3-pro-vision"
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
        if (key !== 'user_id') {
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

      if (data.user_id && data.user_id !== user.uid) {
        throw new Error('Dokumen tidak ditemukan.');
      }

      return { id: snapshot.id, ...data };
    },

    create: async (payload) => {
      const user = await getCurrentUser();

      const dataToSave = {
        ...payload,
        user_id: user.uid,
        created_at: payload.created_at || new Date().toISOString()
      };
      
      const docRef = await addDoc(colRef, dataToSave);
      return { id: docRef.id, ...dataToSave };
    },

    // [CVE-3 Fixed by Herta] — Ownership check pada update()
    update: async (id, payload) => {
      const user = await getCurrentUser();
      const docRef = doc(db, tableName, id);

      const existing = await getDoc(docRef);
      if (!existing.exists()) throw new Error('Dokumen tidak ditemukan.');

      const existingData = existing.data();
      if (existingData.user_id && existingData.user_id !== user.uid) {
        throw new Error('Dokumen tidak ditemukan.');
      }

      const { user_id, ...safePayload } = payload;

      await updateDoc(docRef, safePayload);
      const updatedSnapshot = await getDoc(docRef);
      return { id: updatedSnapshot.id, ...updatedSnapshot.data() };
    },

    // [CVE-3 Fixed by Herta] — Ownership check pada delete()
    delete: async (id) => {
      const user = await getCurrentUser();
      const docRef = doc(db, tableName, id);

      const existing = await getDoc(docRef);
      if (!existing.exists()) throw new Error('Dokumen tidak ditemukan.');

      const existingData = existing.data();
      if (existingData.user_id && existingData.user_id !== user.uid) {
        throw new Error('Dokumen tidak ditemukan.');
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
          user_id: user.uid,
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
