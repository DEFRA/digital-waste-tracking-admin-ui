# Entra ID sign-in with an AWS STS client assertion

A walkthrough of how the admin UI could sign users in with Entra ID, proving itself to Entra with a
short-lived token from AWS STS instead of a client secret. This is CDP's preferred approach (see
[Federated Credentials](https://github.com/DEFRA/cdp-documentation/blob/main/how-to/federated-credentials/overview.md)).

`sign-in.mjs` runs steps 1 to 7 of the sign-in diagram against local emulators, and each step's
comment names the SDK call that does it:

| Step | What happens                                                      | Call                                         |
| ---- | ----------------------------------------------------------------- | -------------------------------------------- |
| 2    | The admin UI redirects the browser to Entra to sign in            | MSAL `getAuthCodeUrl`, with PKCE             |
| 3    | Entra sends the browser back to the callback with a code          | (the browser, played here by `fetch`)        |
| 4, 5 | The admin UI gets a signed JWT for itself from STS                | AWS SDK `GetWebIdentityToken`                |
| 6, 7 | The admin UI swaps the code and that JWT for the user's ID tokens | MSAL `acquireTokenByCode`, `clientAssertion` |

## Running it

From this folder:

```sh
docker compose up -d
npm install
npm start
```

`floci` stands in for AWS (STS and IAM) and `floci-az` for Entra ID.

## How it differs from CDP

- **The STS token is for Floci's account root,** not the admin UI's IAM role, because the script uses
  Floci's test credentials. On CDP, the token's subject is the service's role, such as
  `arn:aws:iam::332499610595:role/digital-waste-tracking-admin-ui` in Dev.
- **floci-az doesn't check the client assertion,** and accepts any redirect URI. Entra checks the
  token's signature against the issuer's keys, and that its issuer, subject and audience match the
  federated credential on the app registration. Floci doesn't serve its issuer's keys yet
  ([floci#7963](https://github.com/floci-io/floci/issues/7963)), so nothing here can verify the
  token.
- **floci-az signs its dev user in straight away,** with no sign-in page.
- **Outbound web identity federation is switched on by the script.** On CDP the platform has already
  done this.
- **floci-az runs with TLS,** as MSAL only talks to an HTTPS authority. `npm start` downloads its
  self-signed certificate for Node to trust.
