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

app.use(cors({
  origin: "*",
  methods: [
    "GET",
    "POST",
    "OPTIONS"
  ],
  allowedHeaders: [
    "Content-Type"
  ]
}));

app.options("*", cors());


app.use(express.json());


// =======================
// 文件上传
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
// 测试接口
// =======================

app.get("/", (req,res)=>{

  res.json({

    status:"ok",

    version:"3.0",

    message:
    "AI Movie Studio Backend Running"

  });

});



// =======================
// FFmpeg 提取音频
// =======================

function runFFmpeg(input, output){

  return new Promise((resolve,reject)=>{


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


      (error,stdout,stderr)=>{


        if(error){

          console.error(
            "FFmpeg error:",
            stderr
          );

          reject(error);

          return;

        }


        resolve();

      }

    );


  });


}



// =======================
// 视频分析接口
// =======================

app.post(

"/api/analyze-video",

upload.single("video"),


async(req,res)=>{


console.log(
  "收到 /api/analyze-video 请求"
);



try{


if(!req.file){


 return res.status(400).json({

   error:
   "没有收到视频文件"

 });


}



console.log(
 "文件:",
 req.file.originalname
);


console.log(
 "大小:",
 req.file.size
);



const videoPath =
req.file.path;


const audioPath =
videoPath + ".mp3";



// 1. 提取声音

console.log(
 "开始 FFmpeg"
);


await runFFmpeg(

 videoPath,

 audioPath

);


console.log(
 "音频完成"
);




// 2. 语音识别

console.log(
 "开始转文字"
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
 "转文字完成"
);





// 3. 剧情分析


const result =

await client.responses.create({


model:

"gpt-4.1-mini",


input:

`
你是一名电影解说专家。

根据下面的对白内容：

${transcript}


生成：

1. 故事简介
2. 主要人物
3. 冲突
4. 关键剧情
5. 适合短视频解说的稿子

不要编造不存在的信息。
`

});




const summary =
result.output_text;




// 删除临时文件


fs.unlink(
videoPath,
()=>{}
);


fs.unlink(
audioPath,
()=>{}
);




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
