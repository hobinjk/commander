// TODO: document how to set up oauth and glitch

const bodyParser = require('body-parser');
const express = require('express');
const fetch = require('node-fetch');
const simpleOAuth2 = require('simple-oauth2');

const app = express();
// Replace with your actual gateway
let gateway = 'https://your-host.mozilla-iot.org';
let jwt = '';

app.use(bodyParser.json());

app.use('/', express.static('./'));

app.post('/gateway', function(req, res) {
  gateway = req.body.gateway;
  res.send(200);
});

const CLIENT_ID = 'glitch-client';
const CLIENT_SECRET = 'this should be randomly generated';
const REQUEST_SCOPE = '/things:readwrite';
const requestState = 'this should be randomly generated per request';

const oauth2 = simpleOAuth2.create({
  client: {
    id: CLIENT_ID,
    secret: CLIENT_SECRET,
  },
  auth: {
    tokenHost: `${gateway}/oauth`,
  },
});

app.get('/is-auth', (req, res) => {
  res.json({
    auth: !!jwt,
  });
});

app.get('/auth', (req, res) => {
  res.redirect(oauth2.authorizationCode.authorizeURL({
    redirect_uri: `${gateway}/callback`,
    scope: REQUEST_SCOPE,
    state: requestState,
  }));
});

app.get('/callback', (req, res) => {
  const code = req.query.code;
  if (req.query.state !== requestState) {
    res.status(400).json({
      error: 'State mismatch',
    });
    return;
  }

  oauth2.authorizationCode.getToken({code: code}).then((result) => {
    const token = oauth2.accessToken.create(result);
    jwt = token;
    res.redirect('/');
  }).catch((err) => {
    res.status(400).json(err);
  });
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
