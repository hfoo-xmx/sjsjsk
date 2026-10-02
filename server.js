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
        "-b:a",
        "64k",
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

    message:
      "AI Movie Studio V3 正常运行"

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

          error:
            "没有收到视频文件"

        });

      }


      videoPath =
        req.file.path;


      audioPath =
        `${videoPath}.mp3`;


      console.log(
        "收到视频：",
        req.file.originalname
      );


      /*
       * 1.
       * 提取视频音频
       */

      await runFFmpeg(

        videoPath,

        audioPath

      );


      console.log(
        "音频提取完成"
      );


      /*
       * 2.
       * AI语音转文字
       */

      const transcription =

        await client.audio.transcriptions.create({

          file:
            fs.createReadStream(
              audioPath
            ),

          model:
            "gpt-4o-transcribe"

        });


      const transcript =
        transcription.text;


      console.log(
        "语音识别完成"
      );


      /*
       * 3.
       * AI分析剧情
       */

      const prompt = `

你是一名专业电影剧情分析师。

下面是一段电影/短剧的对白转写：

${transcript}

请分析这段内容。

输出：

【主要人物】
列出主要人物及身份。

【故事发展】
按照时间顺序整理剧情。

【主要冲突】
说明故事核心矛盾。

【关键转折】
找出重要反转或剧情变化。

【结局】
如果提供的内容包含结局，请说明结局。

【解说素材】
整理成适合电影解说使用的剧情素材。

不要虚构原文没有的信息。

`;


      const response =

        await client.responses.create({

          model:
            "gpt-6-luna",

          input:
            prompt

        });


      const summary =
        response.output_text;


      /*
       * 4.
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


      /*
       * 5.
       * 返回结果
       */

      res.json({

        success: true,

        filename:
          req.file.originalname,

        transcript,

        summary

      });


    }

    catch(error) {

      console.error(error);


      if(videoPath) {

        fs.unlink(
          videoPath,
          () => {}
        );

      }


      if(audioPath) {

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

      `AI Movie Studio V3 running on ${PORT}`

    );

  }

);
