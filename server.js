import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  dest: "/tmp/uploads/"
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    version: "2.0",
    message: "AI Movie Studio V2 后端运行正常"
  });
});

app.post("/api/analyze-video", upload.single("video"), async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        error: "没有收到视频文件"
      });
    }

    console.log("收到视频：", req.file.originalname);
    console.log("文件大小：", req.file.size);

    /*
      V2 第一阶段：
      先确认服务器能够真正收到用户上传的视频。

      下一阶段再加入：
      视频 → 音频 → ASR → 剧情分析
    */

    const result = {
      success: true,
      filename: req.file.originalname,
      size: req.file.size,
      message: "服务器已经成功收到视频文件"
    };

    fs.unlink(req.file.path, () => {});

    res.json(result);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });

  }

});

app.listen(process.env.PORT || 3000, () => {
  console.log("AI Movie Studio V2 running");
});
