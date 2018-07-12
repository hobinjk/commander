// TODO: set up oauth and all that junk

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const bodyParser = require('body-parser');
const express = require('express');
const fetch = require('node-fetch');
const app = express();
// Replace with your actual gateway and JWT
let gateway = 'https://localhost:4443';
// eslint-disable-next-line max-len
const jwt = '';

app.use(bodyParser.json());

app.use('/', express.static('./'));

app.post('/gateway', function(req, res) {
  gateway = req.body.gateway;
  res.send(200);
});

app.post('/commands', function(req, res) {
  const text = req.body.text;
  if (text.includes('devices') || text.includes('things')) {
    // how to do request yourself
    fetch(`${gateway}/things`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    }).then((res) => {
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      return res.json();
    }).then((things) => {
      console.log('Success part 2', things);
      res.json({
        text: `There are ${things.length} things`,
      });
    }).catch((err) => {
      console.error('Error', err);
      res.json({
        text: 'Something bad happened',
      });
    });
  } else {
    // Calling the gateway's intent parser directly
    console.log('start commands fetch');
    fetch(`${gateway}/commands`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        text: text.toUpperCase(),
      }),
    }).then((res) => {
      console.log('commands fetch part 1', res);
      if (!res.ok) {
        console.error('Error', res);
        throw new Error(res.statusText);
      }
      return res.json();
    }).then((body) => {
      console.log('Success part 2', body);

      let keyword;
      switch (body.payload.keyword) {
        case 'make':
          keyword = 'making';
          break;
        case 'change':
          keyword = 'changing';
          break;
        case 'set':
          keyword = 'setting';
          break;
        case 'dim':
          keyword = 'dimming';
          break;
        case 'turn':
        case 'switch':
        case 'brighten':
        default:
          keyword = `${body.payload.keyword}ing`;
          break;
      }

      let preposition = '';
      switch (body.payload.keyword) {
        case 'dim':
        case 'brighten':
          if (body.payload.value) {
            preposition = 'by ';
          }
          break;
        case 'set':
          if (body.payload.value) {
            preposition = 'to ';
          }
          break;
      }

      const value = body.payload.value ? body.payload.value : '';

      res.json({
        text:
          `OK, ${keyword} the ${body.payload.thing} ${preposition}${value}.`,
      });
    }).catch((err) => {
      console.log(err);
      res.json({
        text: 'Sorry, I didn\'t understand.',
      });
    });
  }
});

// app.use('/oauth', simpleoauthstuff);

app.listen(9001);
