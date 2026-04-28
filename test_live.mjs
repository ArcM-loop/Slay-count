async function test() {
  const r = await fetch('https://accountomation.web.app');
  const html = await r.text();
  const jsMatch = html.match(/src="\/assets\/(index-[^"]+\.js)"/);
  if (jsMatch) {
    const r2 = await fetch('https://accountomation.web.app/assets/' + jsMatch[1]);
    const js = await r2.text();
    console.log('Anon key matches:', js.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)?.length);
  }
}
test();
