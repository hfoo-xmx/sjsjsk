import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Movie Studio 后端正在运行"
  });
});

app.post("/api/generate-script", async (req, res) => {
  try {

    const {
      movieInfo,
      style = "电影解说",
      duration = "5分钟"
    } = req.body;

    if (!movieInfo) {
      return res.status(400).json({
        error: "缺少电影剧情信息"
      });
    }

    const prompt = `
你是一名专业的中文电影解说编剧。

请根据下面提供的电影信息，
生成一篇适合短视频平台的电影解说稿。

电影信息：
${movieInfo}

解说风格：
${style}

目标时长：
${duration}

要求：

1. 开头迅速制造悬念。
2. 语言口语化。
3. 按照剧情发展讲述。
4. 保留重要人物和关键事件。
5. 不要虚构不存在的剧情。
6. 每隔一段制造新的悬念。
7. 最终形成完整故事。
8. 只输出解说稿，不要解释创作过程。
`;

    const response = await client.responses.create({
      model: "gpt-6-luna",
      input: prompt
    });

    res.json({
      success: true,
      script: response.output_text
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message || "AI生成失败"
    });

  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI Movie Studio running on port ${PORT}`);
});
