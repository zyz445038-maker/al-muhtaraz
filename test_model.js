require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const client = new OpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: process.env.GITHUB_TOKEN || '',
});
async function run() {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'hello' }]
    });
    console.log("Success with gpt-4o-mini:", response.choices[0].message.content);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
run();
