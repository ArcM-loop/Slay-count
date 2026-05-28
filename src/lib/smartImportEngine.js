/**
 * BIYO SMART IMPORT ENGINE
 * Logika untuk memproses file CSV/Excel yang berantakan dan memetakannya ke format SlayCount.
 */

export const analyzeColumns = (headers) => {
    const mapping = {
        date: null,
        description: null,
        amount: null,
        category: null,
        reference: null
    };

    const keywords = {
        date: ['tanggal', 'date', 'kapan', 'tgl', 'time', 'waktu'],
        description: ['keterangan', 'deskripsi', 'description', 'notes', 'memo', 'item', 'rincian'],
        amount: ['nominal', 'amount', 'harga', 'total', 'jumlah', 'price', 'value', 'duit', 'keluar', 'masuk'],
        category: ['kategori', 'category', 'akun', 'account', 'coa', 'jenis'],
        reference: ['ref', 'invoice', 'no', 'nomor', 'bukti']
    };

    headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase().trim();
        
        for (const [key, searchTerms] of Object.entries(keywords)) {
            if (searchTerms.some(term => lowerHeader.includes(term))) {
                // Prioritaskan mapping pertama yang ketemu
                if (!mapping[key]) {
                    mapping[key] = { index, headerName: header };
                }
            }
        }
    });

    return mapping;
};

// [CVE-9 Helper] Mencegah serangan CSV / Formula Injection
// Karakter pemicu formula Excel/Sheets di awal kata wajib di-escape menggunakan petik tunggal (')
const sanitizeValue = (val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    if (!trimmed) return '';
    
    const formulaChars = ['=', '+', '-', '@', '|', '\r', '\n'];
    if (formulaChars.some(char => trimmed.startsWith(char))) {
        // Tambahkan petik tunggal di depan untuk memaksa Excel membacanya sebagai string biasa
        return `'${trimmed}`;
    }
    return trimmed;
};

export const cleanData = (rows, mapping, coaSuggestions = []) => {
    return rows.map(row => {
        const rawDate = row[mapping.date?.index] || '';
        const rawDesc = row[mapping.description?.index] || 'Tanpa Keterangan';
        const rawCategory = row[mapping.category?.index] || '';
        const rawRef = row[mapping.reference?.index] || '';

        let amountVal = row[mapping.amount?.index];
        // Skenario 2 Kolom (Debet / Kredit): Jika kosong, nol, atau '-', cari kolom angka lainnya di baris yang sama!
        if (!amountVal || String(amountVal).trim() === '-' || String(amountVal).trim() === '' || parseFloat(String(amountVal).replace(/[^0-9.-]+/g, "")) === 0) {
            for (let i = 0; i < row.length; i++) {
                if (i !== mapping.date?.index && i !== mapping.description?.index && i !== mapping.reference?.index && i !== mapping.category?.index) {
                    const candidate = String(row[i]).trim();
                    if (candidate && candidate !== '-' && /[0-9]/.test(candidate)) {
                        const parsedCand = parseFloat(candidate.replace(/[^0-9.-]+/g, ""));
                        if (parsedCand > 0) {
                            amountVal = candidate;
                            break;
                        }
                    }
                }
            }
        }

        const cleanedRow = {
            date: rawDate.trim() || new Date().toISOString().split('T')[0],
            // [CVE-9 Fixed by Herta] — Semua teks yang rentan di-sanitasi ketat
            description: sanitizeValue(rawDesc),
            amount: parseFloat(String(amountVal || 0).replace(/[^0-9.-]+/g, "")) || 0,
            category: rawCategory ? sanitizeValue(rawCategory) : null,
            reference: sanitizeValue(rawRef),
            confidence: 0,
            suggestions: []
        };

        // Jika kategori kosong, coba tebak dari deskripsi lewat LLM
        if (!cleanedRow.category) {
            // Siapkan prompt untuk menebak kategori COA berdasarkan deskripsi
            const prompt = `Berikan satu nama kategori akun (COA) yang paling tepat untuk deskripsi transaksi berikut dalam bahasa Indonesia. Hanya beri nama kategori tanpa penjelasan tambahan.\nDeskripsi: "${cleanedRow.description}"`;
            try {
              const llmRes = await GoogleGenerativeAI.generate({
                prompt,
                temperature: 0.2,
                maxTokens: 64,
                stopSequences: ['\n']
              });
              const category = llmRes?.choices?.[0]?.message?.content?.trim();
              if (category) {
                cleanedRow.category = category;
                cleanedRow.confidence = 0.8;
                cleanedRow.isSuggested = true;
              }
            } catch (e) {
              console.warn('AI category suggestion failed', e);
            }
        } else {
            cleanedRow.confidence = 1.0;
        }

        return cleanedRow;
    });
};
