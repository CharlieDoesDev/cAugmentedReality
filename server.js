// server.js
const express         = require('express');
const multer          = require('multer');
const { GoogleGenAI } = require('@google/genai');

const app    = express();
const upload = multer();

// Hard-coded key (for debugging)
const ai = new GoogleGenAI({
  apiKey: 'AIzaSyAzMgp24IthcMyKHGJhHo5DYs99yzOPBF4'
});

app.use(express.static('public'));

app.post('/analyze', upload.single('photo'), async (req, res) => {
  console.log('🔔 /analyze hit');
  if (!req.file || !req.file.buffer) {
    console.warn('⚠️ No file uploaded');
    return res.status(400).json({ error: 'No image uploaded' });
  }
  console.log(`📷 Received ${req.file.originalname} (${req.file.size} bytes)`);

  let chat;
  try {
    chat = await ai.chats.create({
      model: 'gemini-2.0-flash-001',
      input: {
        multimodal: { image: req.file.buffer },
        text: `I’ve taken a photo of a car.
1) What is its make and model?
2) I have the hood open—list the major engine and under-hood components visible.
Please reply strictly in JSON:
{ "makeModel": "", "components": [ { "name":"", "description":"" } ] }`
      }
    });
  } catch (apiErr) {
    console.error('❌ GenAI API call failed:', apiErr);
    return res.status(502).json({
      error: 'GenAI API request error',
      details: apiErr.message || apiErr.toString()
    });
  }

  // Dump the entire response so we can inspect it
  console.log('🤖 Full GenAI response:', JSON.stringify(chat, null, 2));

  // Safely pull out the text
  const text = chat?.choices?.[0]?.message?.text;
  if (typeof text !== 'string') {
    console.error('❌ Unexpected response shape (no choices[0].message.text)');
    return res.status(500).json({
      error: 'Bad GenAI response shape',
      fullResponse: chat
    });
  }

  // Try JSON.parse, fallback if invalid
  try {
    const payload = JSON.parse(text);
    return res.json(payload);
  } catch (parseErr) {
    console.error('❌ Failed to JSON.parse GenAI text:', parseErr.message);
    return res.status(500).json({
      error: 'GenAI output not valid JSON',
      rawText: text
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
