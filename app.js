const video = document.getElementById("video");
const filename = document.getElementById("filename");

video.addEventListener("change", function () {
  if (this.files.length) {
    filename.innerText = this.files[0].name;
  }
});

async function startGenerate() {

  if (!video.files.length) {
    alert("请先上传电影或短剧");
    return;
  }

  const bar = document.getElementById("bar");
  const status = document.getElementById("status");
  const script = document.getElementById("script");

  const messages = [
    "正在分析视频……",
    "正在识别人物和场景……",
    "正在理解剧情……",
    "正在生成AI解说稿……",
    "正在生成配音和字幕……",
    "正在自动剪辑……"
  ];

  for (let i = 0; i < messages.length; i++) {

    status.innerText = messages[i];

    bar.style.width =
      ((i + 1) / messages.length * 100) + "%";

    await new Promise(resolve =>
      setTimeout(resolve, 700)
    );
  }

  script.value =
`这个故事，从一开始就没有看上去那么简单。

主人公原本以为自己只是偶然卷入了一场意外，却没想到，一个不起眼的线索，让整件事情开始发生变化。

随着调查不断深入，他发现自己身边的人似乎都隐藏着秘密。

而真正让他感到恐惧的是……

这一切可能从一开始就是一个精心设计的局。

接下来发生的事情，更是让所有人都没有想到。

【正式版本】

这里将由AI根据你上传的电影真实内容，
自动生成完整电影解说稿。`;

  status.innerText = "✅ MVP演示生成完成";

  document.getElementById("preview").innerHTML =
    "🎬 AI视频生成完成<br><br>" +
    "接入后端后，这里将播放真实MP4";
}
