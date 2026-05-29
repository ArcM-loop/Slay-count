import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from '../lib/firebaseAdmin.js';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';
import { runDeterministicValidation } from '../lib/ruleEngine.js'; // Keep as first layer
import { serverSwarm } from '../lib/swarm/index.js'; // 25-Agent Swarm
import { z } from 'zod';

const router = express.Router();

// Inisialisasi Gemini (server-side — API key tidak pernah ke browser)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_PRIMARY);
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3-flash';

// ── Input Schema Validation ──────────────────────────────────────────────────
const JournalEntrySchema = z.object({
  account_id: z.string().min(1),
  account_code: z.string().optional(),
  account_name: z.string().optional(),
  account_type: z.string().optional(),
  debit:  z.number().optional().default(0),
  credit: z.number().optional().default(0),
  description: z.string().optional(),
});

const CommitSchema = z.object({
  tx: z.object({
    id:           z.string().min(1),
    business_id:  z.string().min(1),
    date:         z.string(),
    description:  z.string().min(1),
    amount:       z.number(),
    category:     z.string().optional(),
    merchant_name: z.string().optional(),
    isForeignResident: z.boolean().optional(),
    currency:     z.string().optional(),
    exchangeRate: z.number().optional(),
  }),
  debitEntries:  z.array(JournalEntrySchema).min(1),
  creditEntries: z.array(JournalEntrySchema).min(1),
  options: z.object({
    requestAdvisory: z.boolean().optional().default(false),
    existingJournalIds: z.array(z.string()).optional().default([]),
  }).optional().default({})
});

// ── Helper: Dapatkan advisory dari Gemini (tidak memblokir jika gagal) ─────
async function getAIAdvisory(tx, validationWarnings) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Kamu adalah asisten akuntansi Indonesia. Berikan 1 kalimat advisory singkat (bahasa santai/Gen Z) untuk transaksi berikut:
      - Deskripsi: ${tx.description}
      - Kategori: ${tx.category || 'Umum'}
      - Nominal: Rp ${tx.amount?.toLocaleString('id-ID')}
      - Vendor asing: ${tx.isForeignResident ? 'Ya' : 'Tidak'}
      - Warnings: ${validationWarnings.join(', ') || 'Tidak ada'}
      Jawab hanya dengan 1 kalimat advisory dalam JSON: {"advisory": "..."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const json = JSON.parse(text.match(/\{.*\}/s)?.[0] || '{}');
    return json.advisory || null;
  } catch (err) {
    console.warn('[JournalRoute] AI advisory gagal (non-blocking):', err.message);
    return null;
  }
}

// ── POST /api/journal/commit ────────────────────────────────────────────────
router.post('/commit', verifyFirebaseToken, async (req, res) => {
  const requestId = `jrn_${Date.now()}_${req.user.uid.slice(0, 6)}`;
  console.log(`[JournalRoute] ${requestId} — ${req.user.email} committing journal...`);

  // 1. Validasi input schema (Zod)
  const parsed = CommitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PAYLOAD',
      details: parsed.error.flatten()
    });
  }

  const { tx, debitEntries, creditEntries, options } = parsed.data;

  // 2. Verifikasi ownership — user hanya bisa akses business miliknya
  try {
    const db = admin.firestore();
    const businessSnap = await db.collection('businesses').doc(tx.business_id).get();
    if (!businessSnap.exists || businessSnap.data()?.user_id !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Anda tidak memiliki akses ke bisnis ini.'
      });
    }
  } catch (err) {
    console.error('[JournalRoute] Business ownership check failed:', err.message);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }

  // 3. LAYER 1: Jalankan Rule Engine deterministik dasar (Structural Check)
  const basicValidation = runDeterministicValidation({ tx, debitEntries, creditEntries });
  if (!basicValidation.isValid) {
    console.warn(`[JournalRoute] ${requestId} — REJECTED by Basic Rule Engine:`, basicValidation.errors);
    return res.status(422).json({
      success: false,
      error: 'BASIC_VALIDATION_FAILED',
      errors: basicValidation.errors
    });
  }

  // 4. LAYER 2: Jalankan 25-Agent MIROFISH Swarm (Deep Audit)
  // Ambil data akun untuk context swarm
  let accounts = [];
  try {
    const accountsSnap = await admin.firestore()
      .collection('accounts')
      .where('business_id', '==', tx.business_id)
      .get();
    accounts = accountsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[JournalRoute] Failed to fetch accounts for swarm context.');
  }

  const swarmPayload = { ...tx, debitEntries, creditEntries };
  const swarmContext = { user: req.user, accounts };
  
  const swarmResult = await serverSwarm.execute(swarmPayload, swarmContext);

  if (!swarmResult.isFinal) {
    console.warn(`[JournalRoute] ${requestId} — REJECTED by MiroFish Swarm:`, swarmResult.objections);
    return res.status(422).json({
      success: false,
      error: 'SWARM_VALIDATION_FAILED',
      confidence: swarmResult.confidenceScore,
      errors: swarmResult.objections,
      findings: swarmResult.findings
    });
  }

  // 5. AI Advisory (opsional, tidak memblokir)
  let advisory = null;
  if (options.requestAdvisory) {
    advisory = await getAIAdvisory(tx, [...basicValidation.warnings, ...swarmResult.objections]);
  }

  // 6. ACID Atomic Write via Admin SDK
  try {
    const db = admin.firestore();
    const batch = db.batch();
    const now = new Date().toISOString();
    const createdIds = [];

    // 6a. Hapus jurnal lama jika ada
    for (const oldId of (options.existingJournalIds || [])) {
      batch.delete(db.collection('journal_entries').doc(oldId));
    }

    // 6b. Buat entri debit & kredit baru
    const allEntries = [
      ...debitEntries.map(e => ({ ...e, type: 'DEBIT' })),
      ...creditEntries.map(e => ({ ...e, type: 'CREDIT' }))
    ];

    for (const entry of allEntries) {
      const ref = db.collection('journal_entries').doc();
      createdIds.push(ref.id);
      batch.set(ref, {
        ...entry,
        transaction_id: tx.id,
        business_id:    tx.business_id,
        user_id:        req.user.uid,
        date:           tx.date,
        created_at:     now,
        created_by:     req.user.uid,
        source:         'server-swarm-validated',
        confidence:     swarmResult.confidenceScore
      });
    }

    // 6c. Tulis audit log
    const auditRef = db.collection('audit_logs').doc();
    batch.set(auditRef, {
      event:          'JOURNAL_COMMITTED',
      transaction_id: tx.id,
      business_id:    tx.business_id,
      user_id:        req.user.uid,
      user_email:     req.user.email,
      journal_ids:    createdIds,
      confidence:     swarmResult.confidenceScore,
      findings:       swarmResult.findings,
      request_id:     requestId,
      created_at:     now,
    });

    await batch.commit();
    return res.status(201).json({
      success: true,
      journalIds: createdIds,
      warnings: swarmResult.objections,
      advisory,
      requestId
    });

  } catch (err) {
    console.error(`[JournalRoute] ${requestId} — Firestore batch commit failed:`, err);
    return res.status(500).json({ success: false, error: 'COMMIT_FAILED' });
  }
});

router.delete('/entries', verifyFirebaseToken, async (req, res) => {
  const { journalIds, reason, transaction_id, business_id } = req.body;
  if (!Array.isArray(journalIds) || journalIds.length === 0) {
    return res.status(400).json({ success: false, error: 'journalIds array required' });
  }

  try {
    const db = admin.firestore();
    const batch = db.batch();
    const now = new Date().toISOString();

    for (const id of journalIds) {
      batch.delete(db.collection('journal_entries').doc(id));
    }

    const auditRef = db.collection('audit_logs').doc();
    batch.set(auditRef, {
      event:          'JOURNAL_DELETED',
      transaction_id: transaction_id || null,
      business_id:    business_id || null,
      user_id:        req.user.uid,
      user_email:     req.user.email,
      deleted_journal_ids: journalIds,
      reason:         reason || 'No reason provided',
      created_at:     now,
    });

    await batch.commit();
    return res.json({ success: true, deletedCount: journalIds.length });
  } catch (err) {
    console.error('[JournalRoute] Delete failed:', err);
    return res.status(500).json({ success: false, error: 'DELETE_FAILED' });
  }
});

export default router;
