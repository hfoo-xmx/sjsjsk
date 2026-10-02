import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { execFile } from "child_process";
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

function runFFmpeg(input, output) {

  return new Promise((resolve, reject) => {

    execFile(
      "ffmpeg",
      [
        "-y",
        "-i",
        input,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "mp3",
        output
      ],
      (error, stdout, stderr) => {

        if (error) {
          console.error(stderr);
          reject(error);
          return;
        }

        resolve();

      }
    );

  });

}


app.get("/", (req, res) => {

  res.json({
    status: "ok",
    version: "3.0",
    message: "AI Movie Studio 视频分析服务器运行正常"
  });

});


app.post(
  "/api/analyze-video",
  upload.single("video"),
  async (req, res) => {

    let videoPath = null;
    let audioPath = null;

    try {

      if (!req.file) {

        return res.status(400).json({
          error: "没有收到视频"
        });

      }

      videoPath = req.file.path;

      audioPath =
        `${videoPath}.mp3`;

      console.log(
        "开始处理：",
        req.file.originalname
      );


      /*
       * 第一步：
       * 使用 FFmpeg 从电影中提取音频
       */

      await runFFmpeg(
        videoPath,
        audioPath
      );


      /*
       * 第二步：
       * 上传音频给语音识别模型
       */

      const transcription =
        await client.audio.transcriptions.create({

          file:
            fs.createReadStream(audioPath),

          model:
            "gpt-4o-transcribe"

        });


      const transcript =
        transcription.text;


      /*
       * 第三步：
       * AI 根据对白生成剧情总结
       */

      const response =
        await client.responses.create({

          model:
            "gpt-6-luna",

          input: `

你是一名专业电影剧情分析师。

下面是一部电影的语音转写：

${transcript}

请完成：

1. 提取主要人物
2. 梳理故事时间线
3. 找出主要冲突
4. 找出关键反转
5. 总结电影结局
6. 输出一份完整剧情摘要

不要虚构原文没有的信息。

`

        });


      const summary =
        response.output_text;


      /*
       * 清理临时文件
       */

      fs.unlink(
        videoPath,
        () => {}
      );

      fs.unlink(
        audioPath,
        () => {}
      );


      res.json({

        success: true,

        filename:
          req.file.originalname,

        transcript,

        summary

      });


    } catch(error) {

      console.error(error);


      if(videoPath){

        fs.unlink(
          videoPath,
          () => {}
        );

      }


      if(audioPath){

        fs.unlink(
          audioPath,
          () => {}
        );

      }


      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }

);


const PORT =
  process.env.PORT || 3000;


app.listen(
  PORT,
  () => {

    console.log(
      `AI Movie Studio running on ${PORT}`
    );

  }
);
