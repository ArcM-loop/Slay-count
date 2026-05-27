import admin from './lib/firebaseAdmin.js';

async function healData() {
  console.log('🩺 [HEAL DATA] Memulai proses perbaikan transaksi nyasar...');
  const db = admin.firestore();
  let count = 0;

  try {
    const transactionsSnapshot = await db.collection('transactions')
      .where('status', '==', 'Final')
      .get();

    for (const doc of transactionsSnapshot.docs) {
      const tx = doc.data();
      
      // Cek apakah jurnalnya benar-benar ada
      const journalsSnapshot = await db.collection('journal_entries')
        .where('transaction_id', '==', doc.id)
        .limit(1)
        .get();

      if (journalsSnapshot.empty) {
        console.log(`⚠️ Transaksi ${doc.id} berstatus Final tapi tidak memiliki jurnal. Menurunkan status ke Inbox...`);
        await doc.ref.update({
          status: 'Inbox'
        });
        count++;
      }
    }

    console.log(`✅ [HEAL DATA] Selesai! Sebanyak ${count} transaksi nyasar berhasil dikembalikan ke Inbox untuk divalidasi oleh Swarm.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during heal data:', error);
    process.exit(1);
  }
}

healData();
