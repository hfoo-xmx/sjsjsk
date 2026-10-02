import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { execFile } from "child_process";
import OpenAI from "openai";

const app = express();


// =======================
// CORS
// =======================

app.use(
  cors({
    origin: "*",
    methods: [
      "GET",
      "POST",
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type"
    ]
  })
);


app.use(express.json());



// =======================
// 上传配置
// =======================

const upload = multer({

  dest: "/tmp/uploads/"

});



// =======================
// OpenAI
// =======================

const client = new OpenAI({

  apiKey:
    process.env.OPENAI_API_KEY

});



// =======================
// 首页测试
// =======================

app.get("/", (req, res) => {

  res.json({

    status: "ok",

    version: "3.0",

    message:
      "AI Movie Studio Backend Running"

  });

});



// =======================
// FFmpeg
// =======================

function extractAudio(
  input,
  output
){

  return new Promise(
    (resolve, reject)=>{


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


        (error, stdout, stderr)=>{


          if(error){

            console.error(
              stderr
            );

            reject(error);

            return;

          }


          resolve();

        }

      );


    }
  );

}



// =======================
// 视频分析
// =======================

app.post(

"/api/analyze-video",

upload.single("video"),


async(req,res)=>{


console.log(
  "收到视频分析请求"
);



try{


if(!req.file){


return res.status(400).json({

error:
"没有收到视频"

});


}



console.log(

"文件:",

req.file.originalname

);



const videoPath =
req.file.path;


const audioPath =
videoPath + ".mp3";



// 1 FFmpeg

console.log(
"正在提取音频"
);


await extractAudio(

videoPath,

audioPath

);


console.log(
"音频提取完成"
);



// 2 转文字

console.log(
"开始AI转文字"
);



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
"文字生成完成"
);




// 3 剧情分析


const aiResponse =

await client.responses.create({

model:

"gpt-4.1-mini",


input:

`
你是一名专业电影解说作者。

请根据下面的对白内容生成电影解说分析：

${transcript}


输出：

【故事简介】

【主要人物】

【剧情发展】

【核心冲突】

【适合短视频解说稿】

不要添加原文没有的信息。
`

});



const summary =
aiResponse.output_text;




// 删除临时文件

fs.unlink(
videoPath,
()=>{}
);


fs.unlink(
audioPath,
()=>{}
);




// 返回结果

res.json({

success:true,


filename:

req.file.originalname,


size:

req.file.size,


transcript,


summary

});


}

catch(error){


console.error(

"服务器错误:",

error

);



res.status(500).json({

success:false,

error:

error.message

});


}



}

);



// =======================
// 启动
// =======================


const PORT =

process.env.PORT || 3000;



app.listen(

PORT,


()=>{


console.log(

`AI Movie Studio running on ${PORT}`

);


}

);
