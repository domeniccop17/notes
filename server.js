require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());

app.post('/upgrade', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Set up SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (status, message) => {
    res.write(`data: ${JSON.stringify({ status, message })}\n\n`);
  };

  try {
    send('connecting', 'Connecting to Claude API...');

    const html = fs.readFileSync('index.html', 'utf-8');

    send('thinking', 'Claude is analyzing your request...');

    const apiRes = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `Update this HTML with ONLY this change: ${prompt}\n\nCode:\n\`\`\`html\n${html}\n\`\`\`\n\nReturn ONLY the complete updated HTML in a code block.`,
        },
      ],
    });

    send('updating', 'Updating your HTML...');

    const updated =
      apiRes.content[0].text.match(/```html\n([\s\S]*?)\n```/)?.[1] ||
      apiRes.content[0].text;

    fs.writeFileSync('index.html', updated);

    send('deploying', 'Committing and pushing to GitHub...');

    execSync(`git add index.html && git commit -m "${prompt}" && git push`);

    send('success', '✅ Upgrade complete! Your site is now live.');
    res.end();
  } catch (error) {
    console.error('Upgrade error:', error);
    send('error', `❌ Error: ${error.message}`);
    res.end();
  }
});

app.post('/polish', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });
  try {
    const apiRes = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a voice transcript editor. Clean up raw speech-to-text into well-written text:
- Remove filler words: uh, um, like (filler), you know, kind of, sort of, basically
- Fix capitalization and punctuation
- Split run-on sentences at natural clause boundaries
- Preserve the speaker's exact meaning and vocabulary
- Output ONLY the cleaned text, no explanation`,
      messages: [{ role: 'user', content: `Clean up this voice transcript:\n\n${text.trim()}` }],
    });
    res.json({ polished: apiRes.content[0].text.trim() });
  } catch (error) {
    console.error('Polish error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 Upgrade server running at http://localhost:3000');
  console.log('Ready to receive upgrade requests from your Notes app');
});
