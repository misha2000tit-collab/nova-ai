
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.json({ status: "Nova AI server is running" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], imageDataUrl } = req.body;

    if (!message && !imageDataUrl) {
      return res.status(400).json({
        error: "Напиши сообщение или прикрепи изображение."
      });
    }

    const input = [];

    for (const item of history.slice(-12)) {
      if (
        (item.role === "user" || item.role === "assistant") &&
        typeof item.text === "string"
      ) {
        input.push({
          role: item.role,
          content: item.text
        });
      }
    }

    const content = [];

    if (message) {
      content.push({
        type: "input_text",
        text: String(message).slice(0, 4000)
      });
    }

    if (
      typeof imageDataUrl === "string" &&
      /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(imageDataUrl)
    ) {
      content.push({
        type: "input_image",
        image_url: imageDataUrl,
        detail: "auto"
      });
    }

    input.push({
      role: "user",
      content
    });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions:
        "Ты Nova AI — полезный, дружелюбный ИИ-помощник. Отвечай на языке пользователя. Если прислали изображение, помоги его понять.",
      input
    });

    res.json({
      text: response.output_text || "Не удалось сформировать ответ."
    });
  } catch (error) {
    console.error("Nova AI error:", error.message);

    res.status(500).json({
      error: "Не удалось получить ответ от ИИ. Проверь API-ключ, биллинг и настройки сервера."
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Nova AI server listening on ${port}`);
});
