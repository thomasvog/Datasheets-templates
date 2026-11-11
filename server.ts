import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { templates } from './src/data/templates.js';
import { validateDatasheetFit } from './src/utils/pageBudget.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Gemini client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'online',
      service: 'Industrial Datasheet Generator API',
      standard: 'ISA-TR20.00.01 / ISA-20',
      timestamp: new Date().toISOString(),
    });
  });

  // GET /api/templates - list available templates
  app.get('/api/templates', (_req: Request, res: Response) => {
    const list = Object.values(templates).map((t) => ({
      id: t.id,
      category: t.category,
      tag: t.header.tag,
      title: t.header.documentTitle,
      equipmentType: t.header.equipmentType,
      equipmentFunction: t.header.equipmentFunction,
      density: t.density,
    }));
    res.json({ success: true, count: list.length, templates: list });
  });

  // GET /api/templates/:id - get specific template
  app.get('/api/templates/:id', (req: Request, res: Response) => {
    const template = templates[req.params.id];
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    return res.json({ success: true, template });
  });

  // POST /api/datasheet/validate - validate single page constraint
  app.post('/api/datasheet/validate', (req: Request, res: Response) => {
    try {
      const doc = req.body;
      if (!doc || !doc.leftSections || !doc.rightSections) {
        return res.status(400).json({ success: false, error: 'Invalid datasheet document structure' });
      }
      const validation = validateDatasheetFit(doc);
      return res.json({ success: true, validation });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ success: false, error: msg });
    }
  });

  // POST /api/ai/suggest-specs - AI assistant using Gemini
  app.post('/api/ai/suggest-specs', async (req: Request, res: Response) => {
    const { prompt, category, currentDoc } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    try {
      const systemInstruction = `You are a Senior Instrumentation & Process Control Engineer specialized in ISA-20 / ISA-TR20.00.01 specification datasheets for industrial instrumentation and valves (control valves, ball valves, butterfly valves, coriolis flowmeters, magnetic flowmeters, vortex meters, pressure transmitters, temperature transmitters).

Your job is to generate or adapt an authentic, realistic, professional single-page ISA-20 datasheet according to the user request.
Follow strict industrial engineering conventions:
- Use standard materials: ASTM A216 WCB, ASTM A351 CF8M, Hastelloy C-276, Monel 400, Inconel 625, Devlon V, PEEK, Stellite 6, etc.
- Pressure classes: ASME Class 150, 300, 600, 900, 1500 or PN16, PN40.
- Standards: API 598, API 607, IEC 61508 (SIL 2/3), NACE MR0175, ASME B16.5, ASME B16.10, ASME B16.34, ATEX / IECEx Ex db / Ex ia.
- Keep the number of rows balanced between Left and Right columns so the datasheet strictly fits onto 1 single A4 page (no more than 35-40 total rows per column).
- Respond ONLY with valid JSON matching the DatasheetDocument structure without markdown fences or extraneous text.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create or update the industrial datasheet according to this specification:
User prompt: "${prompt}"
Instrument Category: ${category || 'valve'}
Reference Document to base upon: ${JSON.stringify(currentDoc || templates['ball-valve'])}

Output strictly valid JSON with keys:
{
  "id": string,
  "category": "valve" | "flowmeter" | "pressure" | "temperature",
  "density": "compact",
  "header": { "companyName", "project", "location", "tag", "documentTitle", "standard", "equipmentType", "equipmentFunction", "pidRef", "lineNo", "poNo", "revision", "revDesc", "date", "sheet", "status" },
  "leftSections": [ { "id", "name", "isScenarioTable", "scenarios": [...], "rows": [{"num", "label", "unit", "value"}] } ],
  "rightSections": [ { "id", "name", "isScenarioTable", "scenarios": [...], "rows": [{"num", "label", "unit", "value"}] } ],
  "notes": [ {"num", "text"} ],
  "approvals": [ {"role", "name", "signatureDate", "company"} ]
}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      return res.json({ success: true, datasheet: parsed });
    } catch (err: unknown) {
      console.error('Error generating AI specs:', err);
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ success: false, error: msg });
    }
  });

  // Setup Vite middleware in dev or static files in prod
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
