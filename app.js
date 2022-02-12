'use strict';

const express = require('express');
const config = require('config');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const qs = require('qs');
const bodyParser = require('body-parser');
const line = require('@line/bot-sdk')
const app = express();

const lineConfig = config.get("LineChannel");

const lineLoginCongig = config.get("LineLogin");

// 用於辨識Line Channel的資訊
const client = new line.Client(lineConfig);
const port = 3000;

app.get('/', (req, res) => res.send('Hello World! Node.js Yeah!I am Yin 123!!!'));



// const lineParser = bot.parser();
// for line webhook usage
app.post('/linewebhook', line.middleware(lineConfig), (req, res) => {
  console.log(req, res)
  return res.json(handleEvent(req.body.events[0]));

});

//發送消息
app.post('/broadcast', express.json(), (req, res, next) => {
  console.log("broadcast res:");
  console.log(req.body);
  client.broadcast(createMessages(req.body.message)).then(() => {
    res.send('broadcast ok');
  }).catch(function (error) {
    res.send('broadcast fail：' + JSON.stringify(error));
  });
});

//發送個人消息
app.post('/pushMessage', express.json(), (req, res, next) => {
  console.log("broadcast res:");
  console.log(req.body);
  client.pushMessage(req.body.userId, createMessages(req.body.message)).then(() => {
    res.send('broadcast ok');
  }).catch(function (error) {
    res.send('broadcast fail：' + JSON.stringify(error));
  });
});

//取得 line code
app.get("/lineLogin", express.json(), (req, res, next) => {
  let baseurl = lineLoginCongig.lineAuthUrl + "?";
  console.log(lineLoginCongig)
  let parm = {
    response_type: "code",
    client_id: lineLoginCongig.ClientId,
    redirect_uri: lineLoginCongig.RedirectUri,
    state: "state",
    scope: lineLoginCongig.Scope.split(',').join(" "),
    nonce: "sky",
    prompt: "consent",
    max_age: "3600",
    ui_locales: "zh-TW",
    bot_prompt: "normal"
  }
  let queryString = qs.stringify(parm);
  console.log("url:" + baseurl + queryString);
  res.redirect(baseurl + queryString);
});

//取得token並解析
app.get("/getToken", express.json(), (req, res, next) => {
  console.log("getToken res:");
  console.log(req.query);
  const data = {
    grant_type: "authorization_code",
    code: req.query.code,
    redirect_uri: lineLoginCongig.RedirectUri,
    client_id: lineLoginCongig.ClientId,
    client_secret: lineLoginCongig.ClientSecret
  };
  const options = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: qs.stringify(data),
    url: lineLoginCongig.TokenUrl,
  };
  console.log("get token")
  axios(options).then(function (res) {
    console.log("get token success")
    console.log(res)
    let profile = jwt.decode(res.data.id_token);
    console.log(profile)
    client.pushMessage(profile.sub, createMessages(`Hi，${profile.name}，你剛剛登入系統，你的Line Id是${profile.sub}`));
  }).then(function () {
    res.send("帳號申請成功，請關閉本視窗！");
  }).catch(function (error) {
    res.send(error)
  });
});

// ---- 啟動伺服器 ----
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

function handleEvent(event) {
  console.log("event：")
  console.log(event)
  let cReply = { //建立回應訊息
    type: 'text',
    text: `你剛才說了"${event.message.text}"`
  };
  //判斷發送過來的訊息種類
  if (event.type !== 'message' || event.message.type !== 'text') {
    cReply.text = '拍謝，看不懂';
  }
  return client.replyMessage(event.replyToken, cReply);//回覆訊息
}

function createMessages(message) {
  if (typeof message === 'string') {
    return [{ type: 'text', text: message }];
  }
  if (Array.isArray(message)) {
    return message.map(function (m) {
      if (typeof m === 'string') {
        return { type: 'text', text: m };
      }
      return m;
    });
  }
  return [message];
}