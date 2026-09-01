const OpenAI = require('openai');
const client = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY
});

async function main() {
  try {
    const response = await client.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: 'مرحبا' }],
    });
    console.log(response.choices[0].message);
  } catch(e) {
    console.log(e.message || String(e));
  }
}
main();
