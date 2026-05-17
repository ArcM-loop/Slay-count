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

export const cleanData = (rows, mapping, coaSuggestions = []) => {
    return rows.map(row => {
        const cleanedRow = {
            date: row[mapping.date?.index] || new Date().toISOString().split('T')[0],
            description: row[mapping.description?.index] || 'Tanpa Keterangan',
            amount: parseFloat(String(row[mapping.amount?.index]).replace(/[^0-9.-]+/g, "")) || 0,
            category: row[mapping.category?.index] || null,
            reference: row[mapping.reference?.index] || '',
            confidence: 0,
            suggestions: []
        };

        // Jika kategori kosong, coba tebak dari deskripsi
        if (!cleanedRow.category) {
            const desc = cleanedRow.description.toLowerCase();
            const suggestion = coaSuggestions.find(s => 
                s.keywords.some(k => desc.includes(k.toLowerCase()))
            );
            
            if (suggestion) {
                cleanedRow.category = suggestion.name;
                cleanedRow.confidence = 0.85; // Biyo is fairly confident
                cleanedRow.isSuggested = true;
            }
        } else {
            cleanedRow.confidence = 1.0;
        }

        return cleanedRow;
    });
};
