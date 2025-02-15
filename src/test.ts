async function testEndpoint() {
  try {
    console.log('🚀 Starting test...');

    const response = await fetch('http://localhost:3000/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        script: "This is a test message to verify the video generation pipeline."
      })
    });

    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEndpoint(); 