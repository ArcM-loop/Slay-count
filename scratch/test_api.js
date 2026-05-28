async function test() {
  try {
    const response = await fetch('https://slaycount-backend-825422475013.asia-southeast1.run.app/api');
    console.log('Status:', response.status);
    console.log('Body:', await response.text());
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
