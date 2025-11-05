---
title: hello-world
date: 2025-03-23 03:08:57
tags: [日常]
categories: [日常]
---

这是[Hexo](https://hexo.io/)留下的的默认文章，考虑了一下还是把它留下来吧。这个东西以前用Hexo做过一次，但是那次做完之后没多久之前的那台笔记本就坏了，也改不了了。这次重启，主要是想写一下刷LeetCode的题解，以及一些日常之类的分享，当日记本用吧。
``` bash
正经人谁写日记啊
```

至于这篇文章就记录一些常用指令吧，找不到了就回来看看。

<!-- more -->

Welcome to [Hexo](https://hexo.io/)! This is your very first post. Check [documentation](https://hexo.io/docs/) for more info. If you get any problems when using Hexo, you can find the answer in [troubleshooting](https://hexo.io/docs/troubleshooting.html) or you can ask me on [GitHub](https://github.com/hexojs/hexo/issues).

## Quick Start

### Login git

``` bash
$ git config --global user.email {email}
$ git config --global user.name {username}
```

More info: [Git](https://git-scm.com/docs)

### Hexo related

``` bash
$ hexo n [layout] <title>
```

Create a new article. If the layout is not set, the default parameter is used instead of the `default_layout` parameter in `_config. yml`. Use layout `draft` to create drafts. If the title contains spaces, please enclose them in "quotation marks".

``` bash
$ hexo g -d
```

Generate static files and deploy them after completion.

``` bash
$ hexo s
```

Start the server locally. By default, the access URL is: http://localhost:4000/ .

``` bash
$ hexo clean
```

Clear cache files `db.json` and generated static files `public`.

More info: [Hexo](https://hexo.io/zh-cn/docs/index.html)

### Hexo Modify
这次博客自定义修改的内容如下：
	1：主题，使用NexT下的Gemini。
	2：背景图片，用ffmpeg生成的gif图片。

```
.\ffmpeg.exe -i .\Prey_menu_background.mp4 -filter:v fps=20 -lossless 1 -loop 0 -preset default -an -vsync 0 -s 1920:1080 output.gif
```

​	3：侧边栏的自定义，主要包括头像、相关链接、分类和标签、icon的自定义。
​	4：页面底部的一些设计。

其它的也没什么了，青岛的长夜快要破晓了，明天起床再发我的第一篇题解吧，计划前几天每天发两个，把我前面做的每日一题补完，然后后面每天尽量把每日一题的题解发上来。



​	
