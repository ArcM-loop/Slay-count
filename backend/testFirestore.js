import admin from './lib/firebaseAdmin.js';

async function checkDb() {
  const db = admin.firestore();
  
  try {
    const txSnap = await db.collection('transactions').get();
    console.log('--- Transactions ---');
    txSnap.forEach(d => {
      const tx = d.data();
      console.log(`ID: ${d.id} | Desc: ${tx.description} | Date: ${tx.date} | Amount: ${tx.amount} | Status: ${tx.status} | Source: ${tx.source}`);
    });

    const jrnSnap = await db.collection('journal_entries').get();
    console.log('\n--- Journal Entries ---');
    console.log('Total entries:', jrnSnap.size);
    jrnSnap.forEach(d => {
      const j = d.data();
      console.log(`ID: ${d.id} | Acc: ${j.account_name} | Type: ${j.account_type} | D: ${j.debit} | C: ${j.credit} | Date: ${j.date} | TxId: ${j.transaction_id}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error querying Firestore:', err);
    process.exit(1);
  }
}

checkDb();
