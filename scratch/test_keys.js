import fs from 'fs';
import path from 'path';

// Parse backend/.env file
const envPath = path.resolve('backend/.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const keys = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*(GEMINI_API_KEY_[A-Z]+)\s*=\s*(.+?)\s*$/);
  if (match) {
    keys[match[1]] = match[2];
  }
});

console.log('Ditemukan API Keys:', Object.keys(keys));

async function testKey(name, apiKey) {
  const models = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
  console.log(`\n=======================================\nTesting ${name}: ${apiKey.substring(0, 10)}...`);
  
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with exactly 3 words.' }] }]
        })
      });
      
      const status = response.status;
      const data = await response.json().catch(() => ({}));
      
      if (response.ok) {
        console.log(`[OK] Model: ${model} | Status: ${status} | Response: ${data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}`);
      } else {
        console.log(`[FAIL] Model: ${model} | Status: ${status} | Error:`, data.error?.message || JSON.stringify(data));
      }
    } catch (err) {
      console.log(`[ERROR] Model: ${model} | Connection failed:`, err.message);
    }
  }
}

async function run() {
  for (const [name, apiKey] of Object.entries(keys)) {
    await testKey(name, apiKey);
  }
}

run();
