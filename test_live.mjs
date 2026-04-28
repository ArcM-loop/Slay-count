import fs from 'fs';
async function test() {
  const r = await fetch('https://accountomation.web.app');
  const html = await r.text();
  const jsMatch = html.match(/src="\/assets\/(index-[^"]+\.js)"/);
  if (jsMatch) {
    const r2 = await fetch('https://accountomation.web.app/assets/' + jsMatch[1]);
    const js = await r2.text();
    const urls = js.match(/https:\/\/[a-z0-9]+\.supabase\.co[^"']*/g);
    fs.writeFileSync('out.txt', urls ? urls.join('\n') : 'null');
    
    const anonKeys = js.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g);
    fs.writeFileSync('out2.txt', anonKeys ? anonKeys.join('\n') : 'null');
  }
}
test();
