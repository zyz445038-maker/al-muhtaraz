const crypto = require('crypto');

function generateSecMsGecToken() {
  const ticks = BigInt(Math.floor((Date.now() / 1000) + 11644473600)) * BigInt(10000000);
  const roundedTicks = ticks - (ticks % BigInt(3000000000));
  const strToHash = `${roundedTicks}6A5AA1D4EA65408183922387572714F1`;
  return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

async function synthesizeEdgeSpeech(text, voice = 'ar-SA-ZariyahNeural') {
  return new Promise((resolve, reject) => {
    const connectionId = crypto.randomUUID().replace(/-/g, '');
    const secMsGec = generateSecMsGecToken();
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=6A5AA1D4EA65408183922387572714F1&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId=${connectionId}`;

    const ws = new WebSocket(wsUrl);
    const audioChunks = [];

    ws.onopen = () => {
      // 1. Send speech.config
      const configMessage = `X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
      ws.send(configMessage);

      // 2. Send SSML
      const requestId = crypto.randomUUID().replace(/-/g, '');
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ar-SA'><voice name='${voice}'>${text}</voice></speak>`;
      const ssmlMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}Z\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMessage);
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        if (event.data.includes('Path:turn.end')) {
          ws.close();
          const completeAudio = Buffer.concat(audioChunks);
          resolve(completeAudio);
        }
      } else if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
        const buffer = Buffer.from(event.data instanceof ArrayBuffer ? event.data : await event.data.arrayBuffer());
        // Find audio start (binary header delimiter: 0x00 0x00 ...)
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          // Parse header
          const header = buffer.subarray(0, headerEnd).toString('utf-8');
          if (header.includes('Path:audio')) {
            const audioData = buffer.subarray(headerEnd + 4);
            audioChunks.push(audioData);
          }
        }
      }
    };

    ws.onerror = (err) => {
      reject(err);
    };

    setTimeout(() => {
      if (audioChunks.length > 0) {
        resolve(Buffer.concat(audioChunks));
      } else {
        reject(new Error('TTS Timeout'));
      }
    }, 8000);
  });
}

(async () => {
  try {
    console.log('Testing Real Microsoft Neural Edge Arabic synthesis for Zariyah...');
    const audio = await synthesizeEdgeSpeech('يا هلا والله ومسهلا يا أبو ماجد، أنا زاريّة وصوتي بشري وعفوي مية بالمية', 'ar-SA-ZariyahNeural');
    console.log('Success! Audio size:', audio.length, 'bytes');
    require('fs').writeFileSync('zariyah_real.mp3', audio);
  } catch (e) {
    console.error('Error:', e);
  }
})();
