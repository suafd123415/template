import "dotenv/config.js";

import { Contact, Message, ScanStatus, WechatyBuilder, log } from "wechaty";

import qrcodeTerminal from "qrcode-terminal";

import { FileBox } from "file-box";

import {
  godReplies,
  dateEnglish,
  hotSearch,
  robotSay,
  tongueTwister,
  hotWords,
  dailyWeather,
  getCalendar,
  sendEmails,
  poetryQuestion,
  emotionalQuotation,
  poisonChickenSoup,
  musicHotMsg,
  wallPaper,
  getConstellation,
  getJoke,
  landscapeMap,
  littleSisterPicture,
  idiomSolitaire,
  headPortrait,
  reportTime,
  healthyTips,
  lanternRiddles,
  rainbowFart,
  epidemicSituation,
  flattererDog,
  obsceneRemarks,
  microtiaVideo,
  TiktokVideo
} from "./txApi.js";

// 控制机器人开关
let bootOpen = false;
// 控制成语接龙开关
let isStart = false,
  wordList: Array<string> = [],
  endText: "",
  timer: any = null,
  time = 20;
// 控制诗词问答
let problem: any,
  answer = false,
  answerList = [];

// 灯谜答案
let lanternAnswer = "",
  lanternStart = false, roomName = "";

// 控制微视短视频
let micVideo = false;

// 控制抖音视频
let TiktokVideoPlay = false;

function onScan(qrcode: string, status: ScanStatus) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    const qrcodeImageUrl = [
      "https://wechaty.js.org/qrcode/",
      encodeURIComponent(qrcode)
    ].join("");
    log.info(
      "运行机器人",
      "请扫码: %s(%s) - %s",
      ScanStatus[status],
      status,
      qrcodeImageUrl
    );

    qrcodeTerminal.generate(qrcode, { small: true }); // 在终端展示二维码
  } else {
    log.info("运行机器人", "请确认", ScanStatus[status], status);
  }
}

function onLogin(user: Contact) {
  log.info("机器人已启动", "%s 登录", user);
}

function onLogout(user: Contact) {
  log.info("机器人已退出", "%s 退出", user);
}

async function onMessage(msg: Message) {
  console.log(msg.talker().payload?.name + "---" + msg.text());
  // 群管理
  let room = await msg.room();
  let topic = room?.payload?.topic;

  // 撤回的消息
  if (msg.type() == 13) {
    const recalledMessage = await msg.toRecalled();
    console.log(`撤回的消息：${recalledMessage?.talker().name()}---${recalledMessage?.text()}`);
  }

  // 帮助
  let apiList = [
    "加群",
    "日历",
    "绕口令",
    "热搜",
    "神回复",
    "天气",
    "英语",
    "发送邮件",
    "诗词问答",
    "伤感语录",
    "毒鸡汤",
    "网易云热评",
    "壁纸",
    "星座运势",
    "讲个笑话",
    "风景图",
    "疫情查询",
    "成语接龙",
    "猜灯谜",
    "头像",
    "健康小提示",
    "准点报时",
    "舔狗",
    "渣男",
    "网络热词",
    "微视",
    "抖音"
  ],
    helpStr = "";
  if (/^#帮助$/.test(msg.text())) {
    for (let i = 0, leng = apiList.length; i < leng; i++) {
      helpStr += `${i + 1}、${apiList[i]}，命令：#${apiList[i] == "天气"
        ? apiList[i] + "(周)城市名"
        : apiList[i] == "头像"
          ? `${apiList[i]}(1：男头 2：女头 3：动漫 4：景物)`
          : apiList[i] == "疫情查询" ? `${apiList[i]}城市名`
            : apiList[i] == "加群" ? "群名" : apiList[i]
              == "网络热词" ? "查梗" : apiList[i]
        }${i + 1 == leng ? "" : "\n"}`;
    }
    await msg.say(helpStr);
  }

  // 查梗
  if (/^#查梗.+/.test(msg.text())) {
    let data = await hotWords(encodeURI(msg.text().split("#查梗")[1]));
    if (data) {
      await msg.say(data as string);
    }
  };

  // 抖音小姐姐
  if (/^#抖音$/.test(msg.text())) {
    if (TiktokVideoPlay) {
      await msg.say("请等待上一个视频加载完成...");
      return;
    }
    TiktokVideoPlay = true;
    let data: any = await TiktokVideo();
    if (data.code > 0) {
      await msg.say("请稍候...");
      await msg.say(FileBox.fromFile("./file/3.mp4"));
      TiktokVideoPlay = false;
    } else {
      await msg.say(data);
      TiktokVideoPlay = false;
    }
  };

  // 微视短视频
  if (/^#微视$/.test(msg.text())) {
    if (micVideo) {
      await msg.say("请等待上一个视频加载完成...");
      return;
    };
    micVideo = true;
    let data: any = await microtiaVideo();
    if (data.code > 0) {
      msg.say("请稍候...");
      await msg.say(FileBox.fromFile("./file/2.mp4"));
      micVideo = false;
    } else {
      await msg.say(data);
      micVideo = false;
    }
  };

  // 渣男
  if (/#渣男$/.test(msg.text())) {
    let data = await obsceneRemarks();
    await msg.say(data as string);
  };

  // 舔狗语录
  if (/^#舔狗$/.test(msg.text())) {
    let data = await flattererDog();
    await msg.say(data as string);
  };

  // 全国疫情
  if (/^#疫情查询[\u4E00-\u9FA5\uF900-\uFA2D]{2,3}$/.test(msg.text())) {
    let data: any = await epidemicSituation(encodeURI(msg.text().split("#疫情查询")[1] as string));
    if (data.location.city == msg.text().split("#疫情查询")[1] && data.cityData.length > 0) {
      let { time, cityData, local } = data, localText = "";
      if (local.data.localDistricts.length > 0) {
        local.data.localDistricts.map((item: any) => {
          localText += `${item.district == "未公布来源" ? "" : item.district + "\n"}`;
          if (item.track_list.length > 0) {
            item.track_list.map((i: any) => {
              if (item.district == i.district) {
                localText += `轨迹点：${i.loc_name}\n`;
              }
            });
          }
          if (item.risk_area_list.length > 0) {
            item.risk_area_list.map((t: any) => {
              if (item.district == t.district) {
                localText += `${t.level == 1 ? "中风险：" : "高风险："}${t.address}\n`;
              }
            });
          }
          localText += "\n";
        });
      }
      await msg.say(`${cityData.city}昨日新增：${cityData.sure_new_loc}，昨日无症状：${cityData.sure_new_hid}现有确诊：${cityData.present}，高/中风险区：${cityData.danger["2"]}/${cityData.danger["1"]}\n${localText}${time}`);
    } else {
      await msg.say("抱歉未查询出该地区的疫情状况，(。・＿・。)ﾉI’m sorry~");
    }
  };

  // 彩虹屁
  if (msg.text().indexOf("夸") > -1 && !msg.self()) {
    let data = await rainbowFart();
    await msg.say(data as string);
  }

  // 猜灯谜
  if (/^#猜灯谜$/.test(msg.text())) {
    roomName = topic as string;
    let data: any = await lanternRiddles();
    if (data instanceof Object) {
      lanternStart = true;
      let { riddle, answer, description, type } = data;
      lanternAnswer = `${answer}|${description}`;
      await msg.say(
        `谜语：${riddle}\n提示：${type}\n回答要带=号\n\n输入#灯谜答案\n即可查看谜底`
      );
    } else {
      await msg.say(data);
    }
  }
  if (msg.text().split("=")[1] == lanternAnswer.split("|")[0] && lanternStart && !msg.self() && topic == roomName) {
    msg.say("恭喜你，答对啦☺");
  } else if (lanternStart && !msg.self() && topic == roomName) {
    msg.say("答错了，再想想😞")
  }
  if (/^#灯谜答案$/.test(msg.text())) {
    lanternStart = false;
    msg.say(
      `谜底：${lanternAnswer.split("|")[0]}\n详细描述：${lanternAnswer.split("|")[1]
      }`
    );
  }

  // 健康小提示
  if (/^#健康小提示$/.test(msg.text())) {
    let data = await healthyTips();
    await msg.say(`健康小提示：\n${data as string}`);
  }

  // 准点报时
  if (/^#准点报时$/.test(msg.text())) {
    let data: any = await reportTime(encodeURI(`${new Date().getHours()}:00`));
    if (data.code > 0) {
      await msg.say("请稍候...");
      await msg.say(FileBox.fromFile("./file/1.mp3"));
    }
  }

  // 头像
  if (/^#头像\d$/.test(msg.text())) {
    let headText = [
      {
        cn: "男头",
        en: "nan"
      },
      {
        cn: "女头",
        en: "nv"
      },
      {
        cn: "动漫",
        en: "dm"
      },
      {
        cn: "景物",
        en: "jw"
      }
    ];
    let text = headText[(msg.text().split("#头像")[1] as any) * 1 - 1]?.en;
    let data = await headPortrait(encodeURI(text as string));
    await msg.say(FileBox.fromUrl(data as string));
  }

  // 成语接龙
  async function idiom() {
    let data: any = await idiomSolitaire({ isStart, word: wordList.length > 0 ? encodeURI(wordList.join(",")) : "" });
    if (data.code == 200) {
      clearInterval(timer);
      timer = null;
      time = 20;
      isStart = true;
      wordList.push(data.data.name);
      endText = data.data.endStr;
      await msg.say(data.data.name);
      await msg.say(`回答倒计时${time}秒，计时开始。`);
      timer = setInterval(() => {
        console.log(wordList);
        if (time <= 0) {
          msg.say("时间到，游戏结束。");
          isStart = false;
          wordList = [];
          clearInterval(timer);
          timer = null;
          time = 20;
        } else {
          time--;
        };
      }, 1000);
    } else {
      isStart = false;
      wordList = [];
      clearInterval(timer);
      timer = null;
      time = 20;
      await msg.say(`${data.split("，")[0]}，游戏结束。`);
    };
  };
  if (/^#成语接龙$/.test(msg.text()) && !isStart) {
    msg.say("成语接龙,游戏开始！\n注意：回答要带#号");
    idiom();
  }
  if (isStart && /^#[\u4E00-\u9FA5\uF900-\uFA2D]{4}/.test(msg.text()) && wordList.length > 0) {
    if (msg.text().split("#")[1]!.indexOf(endText) > -1) {
      wordList.push(msg.text().split("#")[1] as string);
      idiom();
    } else {
      await msg.say(`请接以${endText}开头的成语！`);
    }
  }
  if (/^#结束成语接龙$/.test(msg.text()) && isStart) {
    isStart = false;
    wordList = [];
    await msg.say("成语接龙游戏已结束");
  }

  // 风景图
  if (/^#风景图$/.test(msg.text())) {
    let data = await landscapeMap();
    await msg.say(FileBox.fromUrl(data as string));
  }
  // 小姐姐图片
  if (/^#小姐姐图片$/.test(msg.text())) {
    console.log(msg);
    let data = await littleSisterPicture();
    await msg.say(FileBox.fromUrl(data as string));
  }
  // 笑话
  if (/^#讲个笑话$/.test(msg.text())) {
    let data = await getJoke();
    await msg.say(data as string);
  }

  // 星座运势
  let constellationList = [
    {
      cn: "白羊座",
      en: "aries"
    },
    {
      cn: "金牛座",
      en: "taurus"
    },
    {
      cn: "双子座",
      en: "gemini"
    },
    {
      cn: "巨蟹座",
      en: "cancer"
    },
    {
      cn: "狮子座",
      en: "leo"
    },
    {
      cn: "处女座",
      en: "virgo"
    },
    {
      cn: "天秤座",
      en: "libra"
    },
    {
      cn: "天蝎座",
      en: "scorpio"
    },
    {
      cn: "射手座",
      en: "sagittarius"
    },
    {
      cn: "摩羯座",
      en: "capricorn"
    },
    {
      cn: "水瓶座",
      en: "aquarius"
    },
    {
      cn: "双鱼座",
      en: "pisces"
    }
  ];
  let date = ["today", "nextday", "week", "month", "year"];
  if (/^#星座运势$/.test(msg.text())) {
    let text = "";
    constellationList.map((item, index) => {
      text += `${index + 1}、${item.cn}\n`;
    });
    text +=
      "输入格式：#星座数字(空格)日期数字(今：1，明：2，周：3，月：4，年：5)";
    msg.say(text);
  }
  if (/^#\d{1,2} \d$/.test(msg.text())) {
    let text: any = msg.text().split("#")[1];
    let data = await getConstellation({
      type: text.split(" ")[0] * 1 - 1 > constellationList.length ? 1 : constellationList[text.split(" ")[0] * 1 - 1]?.en,
      time: date[text?.split(" ")[1] * 1 - 1] || 1
    });
    await msg.say(data as string);
  }

  // 壁纸
  if (/^#壁纸$/.test(msg.text())) {
    let data = await wallPaper();
    if (typeof data == "string") {
      msg.say(data);
    } else if (typeof data == "object") {
      msg.say(FileBox.fromUrl((data as any).url));
    } else {
      msg.say("出大问题了！");
    }
  }

  // 网易云热评
  if (/^#网易云热评$/.test(msg.text())) {
    let data = await musicHotMsg();
    await msg.say(data as string);
  }

  // 毒鸡汤
  if (/^#毒鸡汤$/.test(msg.text())) {
    let data = await poisonChickenSoup();
    await msg.say(data as string);
  }

  // 伤感语录
  if (/^#伤感语录$/.test(msg.text())) {
    let data = await emotionalQuotation();
    await msg.say(data as string);
  }

  // 诗词问答
  if (/^#诗词问答$/.test(msg.text()) && !answer) {
    let data = await poetryQuestion();
    problem = data;
    answer = true;
    await msg.say(
      `问题：${(data as any).question}\n#A:${(data as any).answer_a}\n#B:${(data as any).answer_b
      }\n#C:${(data as any).answer_c}`
    );
  }

  if (/^#[ABCabc]$/.test(msg.text()) && answer && problem) {
    if (
      (problem as any).answer == msg.text().split("#")[1]?.toLocaleUpperCase()
    ) {
      await msg.say(`回答正确\n${(problem as any).analytic}`);
      answer = false;
      problem = null;
      answerList = [];
    } else {
      if (answerList.length == 1) {
        await msg.say(
          `回答错误,正确答案是${(problem as any).answer},真蠢！\n${(problem as any).analytic
          }`
        );
        answer = false;
        problem = null;
        answerList = [];
        return;
      }
      answerList.push(msg.text());
      await msg.say("回答错误,再仔细想想");
    }
  }

  // 摸鱼人日历
  if (/^#日历$/.test(msg.text())) {
    let data = await getCalendar();
    await msg.say(FileBox.fromUrl(data as string));
  }

  // 绕口令
  if (/^#绕口令$/.test(msg.text())) {
    let data = await tongueTwister("秘钥");
    await msg.say(data as string);
  }

  // 热搜
  if (/^#热搜$/i.test(msg.text())) {
    let data = await hotSearch();
    await msg.say(data as string);
  }

  // 神回复
  if (/^#神回复$/.test(msg.text())) {
    let data = await godReplies();
    await msg.say(data as string);
  }

  // 每日天气
  if (
    /^#天气[\u4E00-\u9FA5\uF900-\uFA2D]{2,}/.test(msg.text()) &&
    !/^#天气[\u4E00-\u9FA5\uF900-\uFA2D]{2,}周/.test(msg.text())
  ) {
    let text: any = msg.text().split("#天气")[1];
    if (text.indexOf("周") > -1) {
      text = text.split("周")[1];
    }
    let data: any = await dailyWeather(encodeURI(text as string) as string);
    if (data.code == 1) {
      let {
        date,
        week,
        highest,
        lowest,
        wind,
        weather,
        windsc,
        tips,
        area,
        uv_index,
        real
      } = data.data[0];
      if (msg.text().indexOf("周") == -1) {
        await msg.say(
          `今天是${date.split("-")[0]}年${date.split("-")[1]}月${date.split("-")[2]
          }日，${week}。\n${area}${weather}，当前温度${real}，最高温度${highest}，最低温度${lowest}，${wind}风力${windsc}，紫外线强度${uv_index}级。\n温馨提醒：${tips}`
        );
      } else {
        let textStr = "";
        for (let i = 0, leng = data.data.length; i < leng; i++) {
          let {
            date,
            week,
            highest,
            lowest,
            wind,
            weather,
            windsc,
            tips,
            area,
            uv_index
          } = data.data[i];
          textStr += `${date.split("-")[0]}年${date.split("-")[1]}月${date.split("-")[2]
            }日，${week}\n${area}${weather}，最高温度${highest}，最低温度${lowest}，${wind} 风力${windsc}，紫外线强度${uv_index}级。\n温馨提醒：${tips}${i == leng - 1 ? "" : "\n\n"
            }`;
        }
        await msg.say(textStr);
      }
    }
  }

  // 英语
  if (/^#英语$/i.test(msg.text())) {
    let data = await dateEnglish();
    await msg.say(data as string);
  }

  // 发送邮件
  if (/^#发送邮件$/.test(msg.text())) {
    await msg.say(
      "请输入邮箱地址以及标题和内容,格式：邮箱地址(空格)标题(空格)内容"
    );
  }
  if (
    msg.text() != "" &&
    /^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(
      msg.text().split("</a>")[0]?.split(">")[1] as string
    )
  ) {
    let text = msg.text().split(" ");
    let data: any = await sendEmails(
      `adress=${encodeURI(
        msg.text().split("</a>")[0]?.split(">")[1] as string
      )}&title=${encodeURI(text[3] as string)}&content=${encodeURI(
        text[4] as string
      )}`
    );
    let res = JSON.parse(data);
    if (res.Code == 1) {
      console.log(res);
      msg.say("邮件发送成功");
    }
  }

  // 关键词邀请进群
  if (/^#关键词$/.test(msg.text()) && !msg.self()) {
    let contact: any = await bot.Contact.find({
      name: msg.talker()?.payload?.name
    });
    let room: any = await bot.Room.find({
      topic: "群名"
    });
    if (room) {
      try {
        await room.add(contact);
        await msg.say("已邀请进群");
      } catch (e) {
        console.error(e);
      }
    }
  }

  // 主动拉进群
  if (msg.text().indexOf("邀请") > -1 && msg.self() && topic == "群名") {
    let contact = await bot.Contact.find({
      name: msg.text().split("邀请")[1]
    }) || await bot.Contact.find({
      alias: msg.text().split("邀请")[1]
    });
    let room: any = await bot.Room.find({
      topic: "群名"
    });
    if (room) {
      try {
        await room.add(contact);
        await msg.say("已邀请进群");
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 修改群名
  if (
    room &&
    room?.payload?.topic == "群名" &&
    /^修改群名/.test(msg.text())
  ) {
    await room.topic(msg.text().split("修改群名")[1] as string);
  }

  // 自动回复
  if (msg.self()) {
    if (/^开启机器人$/.test(msg.text())) {
      bootOpen = true;
      msg.say("微信机器人已开启");
    } else if (/^关闭机器人$/.test(msg.text())) {
      bootOpen = false;
      msg.say("微信机器人已关闭");
    }
  }
  if (bootOpen && msg.text() != "" && !msg.self() && /^#[\u4E00-\u9FA5\uF900-\uFA2D]+/.test(msg.text())) {
    apiList.map(item => {
      if (msg.text().split("#")[1] == item) {
        return;
      }
    });
    let data = await robotSay(encodeURI(msg.text().split("#")[1]));
    await msg.say(data as string);
  } else {
    return;
  }
}

// 加入群聊时触发
async function onRoomJoin(room: any, inviteeList: any, _inviter: any) {
  const nameList = inviteeList.map((c: any) => c.name()).join(",");
  let topic = await room.topic();
  let myRoom = await bot.Room.find({
    topic
  });
  if (myRoom && topic == "群名") {
    myRoom.say(`欢迎新朋友${nameList}加入${topic}`);
  } else {
    console.log(1);
  }
}

// 添加好友触发
async function onFriendship(friendship: any) {
  try {
    if (friendship.type() == 2) {
      if (friendship.hello() === "验证信息") {
        await friendship.accept();
      }
    } else if (friendship.type() == 1) {
      let contact = await bot.Contact.find({
        name: friendship.contact().name()
      }) || await bot.Contact.find({
        alias: friendship.contact().name()
      });
      if (contact) {
        await contact.say("你好呀");
        await contact.say("试试输入 #帮助");
      } else {
        console.log("没有此好友");
      }
    } else {
      console.log("添加失败");
    }
  } catch (e) {
    console.error(e);
  }
}

const bot = WechatyBuilder.build({
  name: "ding-dong-bot",
  puppet: "wechaty-puppet-wechat",
  puppetOptions: {
    uos: true
  }
});

bot.on("scan", onScan);
bot.on("login", onLogin);
bot.on("logout", onLogout);
bot.on("message", onMessage);
bot.on("room-join", onRoomJoin);
bot.on("friendship", onFriendship);

bot
  .start()
  .then(() => log.info("启动机器人", "启动成功"))
  .catch((e) => log.error("启动失败", e));
