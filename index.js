'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const config = require('./config.json');
const fetch = require('node-fetch');


// create LINE SDK client
const client = new line.Client(config);

const app = express();

// webhook callback
app.post('/webhook', line.middleware(config), (req, res) => {
  // req.body.events should be an array of events
  if (!Array.isArray(req.body.events)) {
    return res.status(500).end();
  }
  // handle events separately
  Promise.all(req.body.events.map(event => {
      console.log('event', event);
      // check verify webhook event
      if (event.replyToken === '00000000000000000000000000000000' ||
        event.replyToken === 'ffffffffffffffffffffffffffffffff') {
        return;
      }
      return handleEvent(event);
    }))
    .then(() => res.end())
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// simple reply function
const replyText = (token, texts) => {
  texts = Array.isArray(texts) ? texts : [texts];
  return client.replyMessage(
    token,
    texts.map((text) => ({
      type: 'text',
      text
    }))
  );
};

const replyMultiple = (token, payloads) => {
  return client.replyMessage(
    token,
    payloads.reduce((result, each) => {
      if (each.type == 'image') result = [...result, {
        type: each.type,
        originalContentUrl: each.payload,
        previewImageUrl: each.payload
      }]
      else result = [...result, {
        type: each.type,
        text: each.payload
      }]
      return result
    }, [])
  )
}

// callback function to handle a single event
function handleEvent(event) {
  switch (event.type) {
    case 'message':
      const message = event.message;
      switch (message.type) {
        case 'text':
          return handleText(message, event.replyToken, event.source.userId);
        case 'image':
          return handleImage(message, event.replyToken);
        case 'video':
          return handleVideo(message, event.replyToken);
        case 'audio':
          return handleAudio(message, event.replyToken);
        case 'location':
          return handleLocation(message, event.replyToken);
        case 'sticker':
          return handleSticker(message, event.replyToken);
        default:
          throw new Error(`Unknown message: ${JSON.stringify(message)}`);
      }

    case 'follow':
      return replyText(event.replyToken, 'Got followed event');

    case 'unfollow':
      return console.log(`Unfollowed this bot: ${JSON.stringify(event)}`);

    case 'join':
      return replyText(event.replyToken, `Joined ${event.source.type}`);

    case 'leave':
      return console.log(`Left: ${JSON.stringify(event)}`);

    case 'postback':
      let data = event.postback.data;
      return replyText(event.replyToken, `Got postback: ${data}`);

    case 'beacon':
      const dm = `${Buffer.from(event.beacon.dm || '', 'hex').toString('utf8')}`;
      return replyText(event.replyToken, `${event.beacon.type} beacon hwid : ${event.beacon.hwid} with device message = ${dm}`);

    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}

function handleText(message, replyToken, userId) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  // NODE_TLS_REJECT_UNAUTHORIZED = '0'
  if (message.text == 'ฉันคือใคร') {
    fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          Authorization: `Bearer ${config.channelAccessToken}`
        }
      }).then(res => {
        return res.json()
      }).then(profile => {
        console.log(profile)
        const replyMessage = [{
            type: 'image',
            payload: profile.pictureUrl
          },
          {
            type: 'text',
            payload: `name: ${profile.displayName}\nstatus: ${profile.statusMessage}`
          }
        ]
        replyMultiple(replyToken, replyMessage)
      })
      .catch(err => console.log(err))
  } else {
    return replyText(replyToken, message.text);
  }
}

function handleImage(message, replyToken) {
  //return replyText(replyToken, 'Got Image');
  // const imgSrc = "https://otviiisgrrr8.files.wordpress.com/2018/07/zuk.jpg"
  app.use(express.static('public'))
  const imgSrc = `https://89637d43.ngrok.io/webhook/imgs/mark.jpg`;
  const response = [{
    type: 'image',
    originalContentUrl: imgSrc,
    previewImageUrl: imgSrc
  }]
  client.replyMessage(replyToken, response).catch(
    err => console.log(err)
  )
}

function handleVideo(message, replyToken) {
  return replyText(replyToken, 'Got Video');
}

function handleAudio(message, replyToken) {
  return replyText(replyToken, 'Got Audio');
}

function handleLocation(message, replyToken) {
  return replyText(replyToken, 'Got Location');
}

function handleSticker(message, replyToken) {
  // return replyText(replyToken, 'Got Sticker');
  console.log(message)
  const response = [{
    "type": "sticker",
    "packageId": "1",
    "stickerId": "1"
  }]
  client.replyMessage(replyToken, response).catch(
    err => console.log(err)
  )
}

const port = config.port;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});