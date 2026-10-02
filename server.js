import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
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
// AI
// =======================

const openai = new OpenAI({

  apiKey:
  process.env.OPENAI_API_KEY

});


const deepseek = new OpenAI({

  apiKey:
  process.env.DEEPSEEK_API_KEY,

  baseURL:
  "https://api.deepseek.com"

});



const AI_PROVIDER =
process.env.AI_PROVIDER || "deepseek";





// =======================
// 首页
// =======================

app.get("/",(req,res)=>{

res.json({

status:"ok",

version:"5.0",

provider:
AI_PROVIDER,

message:
"AI Movie Studio V5 Running"

});

});





// =======================
// FFmpeg 提取音频
// =======================


function extractAudio(

input,

output

){


return new Promise(

(resolve,reject)=>{


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

output

],


(error)=>{


if(error){

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
// FFmpeg 视频抽帧
// =======================


function extractFrames(

videoPath,

outputDir

){


return new Promise(

(resolve,reject)=>{


if(!fs.existsSync(outputDir)){

fs.mkdirSync(
outputDir,
{
recursive:true
}
);

}



execFile(

"ffmpeg",

[

"-y",

"-i",

videoPath,


"-vf",

"fps=1/5",


path.join(

outputDir,

"frame-%03d.jpg"

)


],


(error)=>{


if(error){

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
// 获取图片列表
// =======================


function getImages(dir){


return fs.readdirSync(dir)

.filter(

file=>

file.endsWith(".jpg")

)

.map(

file=>

path.join(
dir,
file
)

);


// =======================
// AI 文本生成
// =======================

async function generateText(prompt){


if(AI_PROVIDER==="openai"){


const result =
await openai.responses.create({

model:
"gpt-4.1-mini",

input:
prompt

});


return result.output_text;


}



const result =
await deepseek.chat.completions.create({

model:
"deepseek-chat",


messages:[

{

role:"user",

content:prompt

}

]


});


return result.choices[0].message.content;


}






// =======================
// 视频分析接口
// =======================


app.post(

"/api/analyze-video",

upload.single("video"),


async(req,res)=>{


console.log(
"收到视频"
);



try{


if(!req.file){

return res.status(400).json({

error:
"没有上传视频"

});

}




const videoPath =
req.file.path;



const audioPath =
videoPath+".mp3";



const frameDir =
videoPath+"_frames";




// 1. 提取声音


console.log(
"提取音频"
);


await extractAudio(

videoPath,

audioPath

);




// 2. 截取画面


console.log(
"抽取视频画面"
);


await extractFrames(

videoPath,

frameDir

);



const frames =
getImages(frameDir);



console.log(

"截图数量:",

frames.length

);




// 3. 语音识别


console.log(
"语音识别"
);


const transcription =

await openai.audio.transcriptions.create({

file:

fs.createReadStream(
audioPath
),


model:

"gpt-4o-transcribe"

});


const transcript =
transcription.text;





// 4. 生成视觉描述

let visualInfo =
"";



if(frames.length){


visualInfo =
`

视频画面数量：

${frames.length}

请结合视频画面理解剧情。

`;



}




// 5. 生成解说稿


console.log(
"生成解说稿"
);



const script =

await generateText(

`

你是一名百万播放电影解说作者。

根据下面信息生成短视频解说稿。


【对白】

${transcript}



【画面信息】

${visualInfo}



要求：

生成：

1. 爆款标题3个

2. 开头3秒钩子

3. 60-90秒电影解说稿

4. 字幕短句版本


要求：

符合短视频节奏。

突出冲突、悬念、反转。

不要虚构剧情。


`

);






// 清理文件


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


transcript,


script,


frames:
frames.length


});




}

catch(error){


console.error(

error

);



res.status(500).json({

error:
error.message

});


}


}

);







// =======================
// 启动服务器
// =======================


const PORT =
process.env.PORT || 3000;



app.listen(

PORT,

()=>{


console.log(

"AI Movie Studio V5 running on "+
PORT

);


}

);
}
console.log("SERVER FILE LOADED");
