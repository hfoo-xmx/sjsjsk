import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import OpenAI from "openai";


const app = express();


app.use(
  cors({
    origin: "*"
  })
);


app.use(express.json());



const upload = multer({
  dest: "/tmp/uploads/"
});



const openai = new OpenAI({

  apiKey: process.env.OPENAI_API_KEY

});


const deepseek = new OpenAI({

  apiKey: process.env.DEEPSEEK_API_KEY,

  baseURL: "https://api.deepseek.com"

});



const provider =
process.env.AI_PROVIDER || "deepseek";





// 测试接口

app.get("/", (req,res)=>{

  res.json({

    status:"ok",

    version:"5.1",

    provider:provider

  });

});






// 提取音频

function extractAudio(input,output){

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

        output

      ],


      (err)=>{

        if(err){

          reject(err);

        }else{

          resolve();

        }

      }

    );


  });

}





// 视频截图

function extractFrames(video,dir){

  return new Promise((resolve,reject)=>{


    if(!fs.existsSync(dir)){

      fs.mkdirSync(dir,{
        recursive:true
      });

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


      (err)=>{

        if(err){

          reject(err);

        }else{

          resolve();

        }

      }


    );


  });

}





// AI生成文字

async function generateScript(text){


  if(provider==="openai"){


    const result =
    await openai.responses.create({

      model:"gpt-4.1-mini",

      input:text

    });


    return result.output_text;


  }



  const result =
  await deepseek.chat.completions.create({

    model:"deepseek-chat",

    messages:[

      {

        role:"user",

        content:text

      }

    ]

  });



  return result.choices[0].message.content;


}







// 视频分析接口

app.post(

"/api/analyze-video",

upload.single("video"),


async(req,res)=>{


try{


if(!req.file){

return res.status(400).json({

error:"没有视频"

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





console.log("提取音频");


await extractAudio(

videoPath,

audioPath

);




console.log("抽取画面");


await extractFrames(

videoPath,

frameDir

);





console.log("语音识别");


const speech =

await openai.audio.transcriptions.create({

file:

fs.createReadStream(audioPath),

model:

"gpt-4o-transcribe"

});



const transcript =
speech.text;






console.log("生成解说");



const script =

await generateScript(

`

你是一个百万播放电影解说作者。


根据下面内容生成短视频解说：

${transcript}


输出：

1. 三个爆款标题

2. 三秒开场钩子

3. 60秒电影解说稿

4. 字幕短句


要求：

节奏快，有悬念。

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


console.error(error);


res.status(500).json({

error:error.message

});


}



}

);






const PORT =
process.env.PORT || 3000;



app.listen(

PORT,

()=>{

console.log(

"AI Movie Studio V5.1 running on "+
PORT

);

}

);
