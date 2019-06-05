# Commander

Demo of how to create a simple third-party voice assistant for the Mozilla
WebThings Gateway.


## How it works

### OAuth client setup
First, an [OAuth]() client is set up to get a [JSON Web Token]() which will be
used to securely make authenticated requests to the gateway:

```javascript
const CLIENT_ID = 'client-id';
const CLIENT_SECRET = 'randomly generated string from client registration process';
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
```

The `CLIENT_ID` and `CLIENT_SECRET` variables are from the initial client
registration process and will differ on a case-by-case basis. For example, the
server we use in our automated tests listens on the local port 31338 with
client id `'test'` and client secret `'super secret'` which means its
registration looks like this:
```javascript
oauthClients.register(
  new ClientRegistry(new URL('http://127.0.0.1:31338/callback'), 'test',
                     'Test OAuth Client', 'super secret', '/things:readwrite')
);
```

### Local routing for OAuth

To properly guide the user of the voice assistant through the authorization
process, the assistant app needs a few routes defined. These are `/auth` and
`/callback`.

The `/auth` handler kicks off the process by redirecting to the beginning of
the OAuth flow. Note that in a production environment `gateway` should be set
to `https://mozilla-iot.github.io/oauth-proxy/`. This will allow the user to
select their own local gateway instead of being hardcoded to a particular
instance. Once selected, all communication will go directly to the local
gateway. For testing, you can instead set it to
`https://your-host.mozilla-iot.org` to skip the selection process.


```javascript
app.get('/auth', (req, res) => {
  res.redirect(oauth2.authorizationCode.authorizeURL({
    redirect_uri: `${gateway}/callback`,
    scope: REQUEST_SCOPE,
    state: requestState,
  }));
});
```

After completing the OAuth flow, the gateway will redirect the user to your
`/callback` handler with an authorization code. The handler uses this code to
request a proper access token, in this case a JSON Web Token. This token can
then be used in any API request to the gateway.

```javascript
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
```

### Performing commands

Now that the assistant app has a JWT for API access to the gateway, it can perform simple commands at any time.
Of particular note is the following excerpt which sends raw text to which the
gateway will pass through its local intent parser.

```
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
  if (!res.ok) {
    console.error('Error', res);
    throw new Error(res.statusText);
  }
  return res.json();
})
```
