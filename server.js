```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        providers: {
            groq: !!process.env.GROQ_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY,
            huggingface: !!process.env.HF_API_KEY
        }
    });
});

app.post('/api/chat', async (req, res) => {
    const { provider, model, messages } = req.body;

    try {
        if (provider === 'groq') {
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) return res.status(400).json({ error: 'Groq API Key is not set in Environment Variables' });

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model, messages })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Groq request failed');
            return res.json({ reply: data.choices[0].message.content });
        }

        if (provider === 'gemini') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) return res.status(400).json({ error: 'Gemini API Key is not set in Environment Variables' });

            const lastMsg = messages[messages.length - 1].content;
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: lastMsg }] }]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Gemini request failed');
            return res.json({ reply: data.candidates[0].content.parts[0].text });
        }

        if (provider === 'huggingface') {
            const apiKey = process.env.HF_API_KEY;
            if (!apiKey) return res.status(400).json({ error: 'HuggingFace Token is not set in Environment Variables' });

            const response = await fetch('https://api-inference.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model, messages, max_tokens: 1024 })
            });

            const data = await response.json();
            if (!response.ok) throw new Error('HuggingFace request failed');
            return res.json({ reply: data.choices[0].message.content });
        }

        res.status(400).json({ error: 'Invalid provider specified' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 CodeK Backend Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
```
