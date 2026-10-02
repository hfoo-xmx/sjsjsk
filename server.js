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
你现在是一名专业的中文电影解说编剧。

请根据下面的电影信息，创作一篇适合短视频平台的电影解说稿。

电影信息：
${movieInfo}

解说风格：
${style}

目标长度：
${duration}

要求：

1. 开头3秒必须制造悬念。
2. 不要写成影评，要像真正的电影故事解说。
3. 剧情必须按照故事发展顺序。
4. 语言口语化、容易听懂。
5. 每隔一段制造一个悬念。
6. 不要虚构电影中不存在的重要剧情。
7. 最后形成完整的故事闭环。
8. 输出纯中文解说稿，不要解释你的创作过程。

请直接输出最终解说稿。
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
      error: "AI生成失败"
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI Movie Studio server running on port ${PORT}`);
});
