import express from 'express';
import { preFilter, generateKKA } from '../controllers/auditController.js';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';

const router = express.Router();

// Rute aman audit dilindungi oleh middleware Firebase Token
router.post('/pre-filter', verifyFirebaseToken, preFilter);
router.post('/generate-kka', verifyFirebaseToken, generateKKA);

export default router;
