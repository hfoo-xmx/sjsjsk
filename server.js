import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { execFile } from "child_process";
import OpenAI from "openai";

const app = express();


/*
========================
CORS
========================
*/

app.use(
  cors({
    origin:"*",
    methods:[
      "GET",
      "POST",
      "OPTIONS"
    ],
    allowedHeaders:[
      "Content-Type"
    ]
  })
);


app.use(express.json());



/*
========================
上传
========================
*/

const upload =
multer({
  dest:"/tmp/uploads/"
});



/*
========================
AI PROVIDER
========================
*/


const aiProvider =
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





async function generateText(prompt){


if(aiProvider==="openai"){


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





/*
========================
首页
========================
*/


app.get("/",(req,res)=>{


res.json({

status:"ok",

version:"4.0",

provider:
aiProvider,

message:
"AI Movie Studio Running"

});


});






/*
========================
FFmpeg
========================
*/


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







/*
========================
视频分析
========================
*/


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
"没有视频"

});

}



const videoPath =
req.file.path;


const audioPath =
videoPath+".mp3";




console.log(
"提取音频"
);



await extractAudio(

videoPath,

audioPath

);



console.log(
"开始语音识别"
);




const transcript =

await openai.audio.transcriptions.create({

file:

fs.createReadStream(
audioPath
),

model:

"gpt-4o-transcribe"

});


const text =
transcript.text;




console.log(
"生成解说稿"
);



const prompt =

`

你是一名百万播放电影解说作者。


根据下面电影对白：

${text}


生成短视频解说内容。


输出：


【爆款标题】

生成3个。


【开场钩子】

3秒吸引用户。


【剧情简介】


【完整解说稿】

适合60-90秒AI配音。


【字幕文本】

短句分行。


要求：

不要虚构剧情。

突出冲突和反转。

`;



const script =
await generateText(prompt);





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


transcript:text,


script:script

});



}


catch(error){


console.error(error);


res.status(500).json({

error:
error.message

});


}


}

);






/*
========================
启动
========================
*/


const PORT =
process.env.PORT || 3000;



app.listen(

PORT,

()=>{


console.log(

"AI Movie Studio running on "+
PORT

);


}

);
