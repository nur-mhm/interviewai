import express from 'express';
import path from 'path';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { OpenAI } from 'openai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body parser limits for potential large payload sizes
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // Configure multer for file uploads in memory
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API: Extract PDF text
  app.post('/api/extract-pdf', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file was uploaded.' });
      }

      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Uploaded file is not a valid PDF.' });
      }

      // Parse PDF from memory buffer with robust ESM/CJS interop fallback
      let rawText = '';
      let numPages = 0;
      let infoObj = {};

      if (typeof pdf === 'function') {
        // Classic functional pdf-parse
        const parsed = await (pdf as any)(req.file.buffer);
        rawText = parsed.text || '';
        numPages = parsed.numpages || 0;
        infoObj = parsed.info || {};
      } else if (pdf && typeof pdf.PDFParse === 'function') {
        // Modern class-based pdf-parse (v2.4.5)
        const parser = new pdf.PDFParse({ data: req.file.buffer });
        const parsed = await parser.getText();
        rawText = parsed.text || '';
        numPages = parsed.total || parsed.pages?.length || 0;
        try {
          const infoRes = await parser.getInfo();
          infoObj = infoRes.info || {};
        } catch (e) {
          console.warn('Could not extract PDF info metadata:', e);
        }
      } else {
        throw new Error('pdf-parse library resolution failed (neither function nor PDFParse class found).');
      }
      
      // Clean up extracted text: remove redundant carriage returns, whitespaces, etc.
      const cleanedText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (!cleanedText) {
        return res.status(400).json({ error: 'Could not extract any readable text from the PDF. It might be scanned or image-only.' });
      }

      return res.json({ 
        text: cleanedText,
        pages: numPages,
        info: infoObj
      });
    } catch (error: any) {
      console.error('PDF extraction failed:', error);
      return res.status(500).json({ error: `Failed to extract PDF: ${error?.message || error}` });
    }
  });

  // API: Chat Interview handler
  app.post('/api/chat', async (req: express.Request, res: express.Response) => {
    try {
      const { messages, provider, geminiKey, openaiKey, resume, jobContext, mode } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages are required and must be an array.' });
      }

      const companyName = jobContext?.company || 'Target Company';
      const jobRole = jobContext?.role || 'Job Role';
      const activeMode = mode || 'coach';

      // System instruction dynamically decided by selected mode
      let systemInstruction = '';

      if (activeMode === 'coach') {
        systemInstruction = `You are an expert Interview Preparation Helper & Coach. Your primary job is to help the candidate prepare, study, and master their upcoming interview for the role "${jobRole}" at "${companyName}".

Candidate's Resume Context:
${resume || 'No resume text provided.'}

Target Job & Company Context:
Company: ${companyName}
Role/Description: ${jobRole}

YOUR ROLE AS A PREPARATION COACH:
1. Be extremely supportive, collaborative, and pedagogical. Speak as a warm, knowledgeable mentor or tutor, NOT a cold examiner.
2. The user is here to learn, ask questions, ask "how should I say this?", or request sample answers. Encourage them to ask you questions.
3. If the user asks a question, answer it thoroughly, explaining concepts, best practices, and suggestions on how to communicate.
4. If the user practices answering a question or provides experience context, give them helpful feedback and a suggested improved version.
5. If you want to offer a constructive coaching tip or improved answer suggestion, please enclose it in square brackets (e.g., "[Feedback Tip: Great start! To make this answer stronger, use the STAR format: specify what 'Actions' you took and what the concrete 'Result' was. Here is an improved suggestion: 'I refactored our legacy REST APIs, which reduced frontend data payload size by 35% and speeded page render speed by 1.2s.']") at the very beginning of your response. This helps the app render it in a clean highlighted tip box.
6. Suggest classic interview frameworks like STAR (Situation, Task, Action, Result) and help them map their experience.
7. Keep things conversational. Ask them what they want to study next, or suggest a practice question if they are ready.`;
      } else {
        systemInstruction = `You are an expert recruiter. Using the resume [RESUME] and target job [JOB], conduct a mock interview. Ask one professional question at a time. Provide a small feedback tip in brackets after each user answer.

Candidate's Resume Context:
${resume || 'No resume text provided.'}

Target Job & Company Context:
Company: ${companyName}
Role/Description: ${jobRole}

CRITICAL RECRUITER GUIDELINES:
1. Speak as a highly professional, encouraging, yet rigorous technical/behavioral recruiter.
2. Ask exactly ONE clear, concise question at a time.
3. If the candidate just answered your previous question:
   - Provide a highly constructive feedback tip enclosed in square brackets (e.g., "[Feedback: Excellent emphasis on your Rust skills and metrics, but try to also explain how you handled conflict in this project.]") at the very beginning of your response.
   - Keep feedback objective, specific, and actionable.
   - Immediately follow up with your NEXT interview question.
4. Tailor questions strictly to both the resume's experiences and the target role's expectations.
5. If the conversation has just started (no previous real answer to feedback):
   - Welcome the candidate warmly.
   - Briefly state that you are interviewing them for the "${jobRole}" position at "${companyName}".
   - Ask your first question. Do NOT provide feedback in brackets for this introductory turn.`;
      }

      if (provider === 'gemini') {
        const apiKey = geminiKey || process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
          return res.status(400).json({ 
            error: 'Gemini API key is required. Please set GEMINI_API_KEY in the environment or provide a key in the settings panel.' 
          });
        }

        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        // Translate 'assistant' role to 'model' for @google/genai SDK
        const contents = messages.map((msg: any) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        // Robust fallback model list to handle "503 high demand / service unavailable" errors
        const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
        let responseText = '';
        let success = false;
        let lastError: any = null;

        for (const modelName of modelsToTry) {
          try {
            console.log(`[Gemini Engine] Attempting chat completion using model: ${modelName}`);
            const response = await ai.models.generateContent({
              model: modelName,
              contents: contents,
              config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
              }
            });
            
            if (response && response.text) {
              responseText = response.text;
              success = true;
              console.log(`[Gemini Engine] Successfully completed request with model: ${modelName}`);
              break;
            }
          } catch (err: any) {
            console.warn(`[Gemini Engine] Failed attempt with model: ${modelName}. Error:`, err.message || err);
            lastError = err;
          }
        }

        if (!success) {
          throw lastError || new Error('All configured Gemini models failed or are currently unavailable.');
        }

        return res.json({ text: responseText || 'I apologize, I could not generate a response.' });

      } else if (provider === 'openai') {
        const apiKey = openaiKey || process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === 'MY_OPENAI_API_KEY') {
          return res.status(400).json({ 
            error: 'OpenAI API key is required. Please set OPENAI_API_KEY in the environment or provide a key in the settings panel.' 
          });
        }

        const openai = new OpenAI({ apiKey });

        const formattedMessages = [
          { role: 'system', content: systemInstruction },
          ...messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          }))
        ];

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: formattedMessages as any,
          temperature: 0.7,
        });

        return res.json({ text: response.choices[0]?.message?.content || 'I apologize, I could not generate a response.' });

      } else {
        return res.status(400).json({ error: `Invalid provider selected: ${provider}` });
      }

    } catch (error: any) {
      console.error('Chat routing error:', error);
      return res.status(500).json({ 
        error: `Error communicating with AI Provider: ${error?.message || error}` 
      });
    }
  });

  // API: Analyze Performance handler
  app.post('/api/analyze-performance', async (req: express.Request, res: express.Response) => {
    try {
      const { messages, provider, geminiKey, openaiKey, resume, jobContext } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages are required and must be an array.' });
      }

      const companyName = jobContext?.company || 'Target Company';
      const jobRole = jobContext?.role || 'Job Role';

      const systemInstruction = `You are an expert senior recruiter and elite interview preparation coach.
Analyze the candidate's interaction history for the position "${jobRole}" at "${companyName}".
Based on their answers, technical expertise, STAR framework structure, quantitative metrics, and overall confidence:
Provide a rigorous yet constructive performance review.

You MUST respond ONLY with a valid, clean JSON object (do not wrap in markdown \`\`\`json blocks, just return raw JSON).
The JSON object must have this exact structure:
{
  "strengths": [
    "Specific Strength 1 (e.g., 'Articulates clear situation context in behavioral responses')",
    "Specific Strength 2 (e.g., 'Demonstrates sound technical understanding of systems architecture')",
    "Specific Strength 3"
  ],
  "improvements": [
    "Actionable Improvement 1 (e.g., 'Quantify impact. Add metrics like % improvements, time saved, or team sizes')",
    "Actionable Improvement 2",
    "Actionable Improvement 3"
  ],
  "overallScore": 85,
  "summary": "A 2-3 sentence inspiring, professional overview of the candidate's preparedness and next key study recommendations."
}

Contextual Guidelines:
- If the candidate has answered fewer than 2 questions, analyze their starting alignment based on their Resume and suggest they practice more questions.
- Maintain high professional standards but keep it encouraging.
`;

      const contents = [
        {
          role: 'user' as const,
          parts: [{ text: `Here is the interview session history:
---
${messages.map((m: any) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n\n')}
---
And candidate's resume context:
${resume || 'No resume context provided.'}

Generate the JSON performance evaluation now.` }]
        }
      ];

      let rawText = '';

      if (provider === 'gemini') {
        const apiKey = geminiKey || process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
          return res.status(400).json({ 
            error: 'Gemini API key is required. Please set GEMINI_API_KEY in the environment or provide a key in the settings panel.' 
          });
        }

        const ai = new GoogleGenAI({ apiKey });
        // Robust fallback model list to handle "503 high demand / service unavailable" errors
        const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
        let success = false;
        let lastError: any = null;

        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: contents,
              config: {
                systemInstruction: systemInstruction,
                temperature: 0.2,
                responseMimeType: 'application/json'
              }
            });
            
            if (response && response.text) {
              rawText = response.text;
              success = true;
              break;
            }
          } catch (err: any) {
            console.warn(`[Gemini Performance Analysis] Failed attempt with model: ${modelName}. Error:`, err.message || err);
            lastError = err;
          }
        }

        if (!success) {
          throw lastError || new Error('All configured Gemini models failed or are currently unavailable.');
        }

      } else if (provider === 'openai') {
        const apiKey = openaiKey || process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === 'MY_OPENAI_API_KEY') {
          return res.status(400).json({ 
            error: 'OpenAI API key is required. Please set OPENAI_API_KEY in the environment or provide a key in the settings panel.' 
          });
        }

        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: contents[0].parts[0].text }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        });

        rawText = response.choices[0]?.message?.content || '';

      } else {
        return res.status(400).json({ error: `Invalid provider selected: ${provider}` });
      }

      // Clean up markdown block wraps if present
      let cleanedText = rawText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }

      const parsedJSON = JSON.parse(cleanedText);
      return res.json(parsedJSON);

    } catch (error: any) {
      console.error('Performance analysis routing error:', error);
      return res.status(500).json({ 
        error: `Failed to analyze performance: ${error?.message || error}` 
      });
    }
  });

  // Integrate Vite Dev Server Middleware or Static Build Asset Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded in Development mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Static server loaded in Production mode');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
