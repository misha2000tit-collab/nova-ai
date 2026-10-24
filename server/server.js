import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '8mb' }));

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

app.get('/health', (_req, res) => res.json({ ok: true, service: 'Nova AI API' }));

app.post('/api/chat', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'Сервер не настроен: отсутствует OPENAI_API_KEY.' });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
  const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : null;
  if (!message && !imageDataUrl) return res.status(400).json({ error: 'Добавь текст или изображение.' });
  if (message.length > 4000) return res.status(413).json({ error: 'Сообщение слишком длинное (максимум 4000 символов).' });
  if (imageDataUrl && (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(imageDataUrl) || imageDataUrl.length > 6_000_000)) {
    return res.status(400).json({ error: 'Неподдерживаемое или слишком большое изображение. Выбери JPG, PNG или WebP поменьше.' });
  }

  const historyText = history
    .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string')
    .map(m => `${m.role === 'user' ? 'Пользователь' : 'Nova'}: ${m.text.slice(0, 2000)}`)
    .join('\n');
  const prompt = `${historyText ? `Контекст предыдущей переписки:\n${historyText}\n\n` : ''}Новое сообщение пользователя: ${message || 'Проанализируй изображение и опиши, что на нём видно.'}`;
  const content = [{ type: 'input_text', text: prompt }];
  if (imageDataUrl) content.push({ type: 'input_image', image_url: imageDataUrl, detail: 'auto' });

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: 'Ты Nova AI — дружелюбный и полезный помощник. Отвечай на языке пользователя. Если анализируешь изображение, различай то, что действительно видно, и предположения. Не выдумывай детали.',
      input: [{ role: 'user', content }],
      max_output_tokens: 900
    });
    res.json({ text: response.output_text || 'Не удалось сформировать текстовый ответ.' });
  } catch (error) {
    console.error('OpenAI request failed:', error?.status || error?.message || 'unknown error');
    res.status(502).json({ error: 'ИИ временно недоступен. Попробуй ещё раз позже.' });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => console.log(`Nova AI API listening on port ${port}`));
