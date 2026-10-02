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
    origin: "*"
  })
);


app.use(express.json());



// =======================
// 上传
// =======================

const upload = multer({

  dest: "/tmp/uploads/"

});




// =======================
// AI 配置
// =======================

const provider =
process.env.AI_PROVIDER || "deepseek";



const openai =
new OpenAI({

apiKey:
process.env.OPENAI_API_KEY

});



const deepseek =
new OpenAI({

apiKey:
process.env.DEEPSEEK_API_KEY,

baseURL:
"https://api.deepseek.com"

});




// =======================
// 首页
// =======================

app.get("/",(req,res)=>{

res.json({

status:"ok",

version:"5.1.1",

provider:provider,

message:
"AI Movie Studio Running"

});

});




// =======================
// Render健康检查
// =======================

app.get("/health",(req,res)=>{


res.status(200).json({

status:"healthy"

});


});






// =======================
// FFmpeg 音频
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

output

],


(error)=>{


if(error){

reject(error);

}else{

resolve();

}


}


);


}


);


}






// =======================
// FFmpeg截图
// =======================

function extractFrames(
video,
dir
){


return new Promise(
(resolve,reject)=>{


if(!fs.existsSync(dir)){

fs.mkdirSync(
dir,
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

video,

"-vf",

"fps=1/5",

path.join(
dir,
"frame-%03d.jpg"
)

],


(error)=>{


if(error){

reject(error);

}else{

resolve();

}


}


);



}


);


}






// =======================
// AI生成
// =======================

async function generateScript(
prompt
){


if(provider==="openai"){


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


try{


if(!req.file){

return res.status(400).json({

error:
"没有上传视频"

});

}



console.log(
"收到视频:",
req.file.originalname
);



const videoPath =
req.file.path;



const audioPath =
videoPath+".mp3";



const frameDir =
videoPath+"_frames";





console.log(
"提取音频"
);



await extractAudio(

videoPath,

audioPath

);




console.log(
"抽取画面"
);



await extractFrames(

videoPath,

frameDir

);






console.log(
"语音识别"
);



const speech =

await openai.audio.transcriptions.create({

file:

fs.createReadStream(audioPath),


model:

"gpt-4o-transcribe"

});



const transcript =
speech.text;






console.log(
"生成解说稿"
);



const script =

await generateScript(

`

你是一名百万播放电影解说作者。


根据下面电影对白生成短视频解说。


对白：

${transcript}



输出：

1. 爆款标题3个

2. 开场3秒钩子

3. 60秒电影解说稿

4. 字幕文本


要求：

节奏快。

突出冲突。

不要虚构剧情。

`

);





res.json({

success:true,

transcript:transcript,

script:script

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
// 启动
// =======================

const PORT =
process.env.PORT || 3000;



app.listen(

PORT,

()=>{


console.log(

"AI Movie Studio V5.1.1 running on "+
PORT

);


}

);
