import fetch from 'node-fetch';

// ==========================================
// 1. Fungsi Parser yang Diuji (Salinan Persis)
// ==========================================

const parseIndonesianNumber = (str) => {
    if (str === undefined || str === null) return 0;
    let cleaned = String(str).trim();
    if (!cleaned) return 0;
    
    cleaned = cleaned.replace(/^(Rp|USD|EUR)\.?\s*/i, '');
    
    if (cleaned.includes('.') && cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } 
    else if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        const isThousand = parts.slice(1).every(part => part.length === 3);
        if (isThousand) {
            cleaned = cleaned.replace(/,/g, '');
        } else {
            cleaned = cleaned.replace(/,/g, '.');
        }
    } 
    else if (cleaned.includes('.')) {
        const parts = cleaned.split('.');
        const isThousand = parts.slice(1).every(part => part.length === 3);
        if (isThousand) {
            cleaned = cleaned.replace(/\./g, '');
        }
    }
    
    return parseFloat(cleaned) || 0;
};

const excelSerialToDate = (val) => {
    if (!val) return '';
    const trimmed = String(val).trim();
    if (!trimmed) return '';
    
    const num = Number(trimmed);
    if (!isNaN(num) && num > 30000 && num < 100000) {
        try {
            const date = new Date((num - 25569) * 86400 * 1000);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            // Fallback
        }
    }
    return trimmed;
};

// ==========================================
// 2. Unit Tests
// ==========================================

console.log('====== MEMULAI UNIT TEST PARSER LOKAL ======');

const testCasesNumber = [
    { input: '15.000', expected: 15000 },
    { input: '750.000', expected: 750000 },
    { input: '8,5', expected: 8.5 },
    { input: '2,01', expected: 2.01 },
    { input: 'Rp 1.250.000,50', expected: 1250000.50 },
    { input: '15', expected: 15 },
    { input: '8.5', expected: 8.5 }
];

let numberPass = true;
testCasesNumber.forEach(tc => {
    const result = parseIndonesianNumber(tc.input);
    const pass = Math.abs(result - tc.expected) < 0.0001;
    console.log(`[Number Test] Input: "${tc.input}" -> Result: ${result} | Expected: ${tc.expected} -> ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!pass) numberPass = false;
});

const testCasesDate = [
    { input: '46168', expected: '2026-05-26' }, // 26 May 2026
    { input: '2026-05-29', expected: '2026-05-29' }
];

let datePass = true;
testCasesDate.forEach(tc => {
    const result = excelSerialToDate(tc.input);
    const pass = result === tc.expected;
    console.log(`[Date Test] Input: "${tc.input}" -> Result: "${result}" | Expected: "${tc.expected}" -> ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!pass) datePass = false;
});

// ==========================================
// 3. Simulasi Panggilan Gemini & Failover
// ==========================================

console.log('\n====== MEMULAI SIMULASI GEMINI API & FAILOVER ======');

// Menggunakan API key baru darimu
const API_KEY = 'AIzaSyAwMzf7bFsum0m0SUtHnhQXDdUDYMQQ93Q';

async function testGeminiCall(modelName) {
    const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    
    const requestBody = {
        contents: [{ parts: [{ text: 'Katakan "Biyo" jika kamu mendengar pesan ini.' }] }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 64
        }
    };
    
    console.log(`[API Request] Mengirim pesan menggunakan model: ${modelName}...`);
    const res = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });
    
    return res;
}

async function runApiTest() {
    let model = 'gemini-3-flash';
    let res = await testGeminiCall(model);
    
    console.log(`[API Response] Status code: ${res.status}`);
    
    if (!res.ok && (res.status === 404 || res.status === 400)) {
        console.warn(`[Failover Triggered] Model ${model} tidak didukung atau 404. Melakukan failover dinamis ke gemini-2.0-flash...`);
        model = 'gemini-2.0-flash';
        res = await testGeminiCall(model);
        console.log(`[API Response Failover] Status code: ${res.status}`);
    }
    
    if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        console.log(`[API Success ✅] Output model: "${text}"`);
    } else {
        const errText = await res.text();
        console.error(`[API Failure ❌] Error body:`, errText);
    }
}

runApiTest();
