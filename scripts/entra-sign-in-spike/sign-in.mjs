// Walks through Chris's "Admin UI: Entra ID sign-in via AWS STS" diagram, steps
// 1-7, against local emulators: Floci (AWS) for STS and floci-az (Azure) for
// Entra ID. Each step's comment names the SDK call that does it, as the admin
// UI would make it.
//
// Run from this folder: docker compose up -d, npm install, then npm start

import {
  IAMClient,
  EnableOutboundWebIdentityFederationCommand
} from '@aws-sdk/client-iam'
import { STSClient, GetWebIdentityTokenCommand } from '@aws-sdk/client-sts'
import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node'

// Local stand-ins for what CDP and Entra provide for real
const awsConfig = {
  region: 'eu-west-2',
  endpoint: 'http://localhost:4599', // Floci (on CDP: the real, regional STS)
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' } // on CDP: the ECS task's role credentials
}
const tenantId = '00000000-0000-0000-0000-000000000002' // floci-az's default tenant (on CDP: Defra's)
const clientId = '11111111-1111-1111-1111-111111111111' // floci-az's dev app (on CDP: the admin UI's app registration)
const authority = `https://localhost:4577/${tenantId}` // on CDP: https://login.microsoftonline.com/<tenant>
const redirectUri = 'http://localhost:3000/auth/callback' // the admin UI's callback route
const audience = 'api://AzureADTokenExchange' // must match the federated credential's Audience

const decode = (jwt) =>
  JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())

// Setup, once per AWS account. On CDP the platform has already done this; it's
// what makes the account an issuer (CDP_JWT_ISSUER) that Entra can be told to trust
const iam = new IAMClient(awsConfig)
try {
  const { IssuerIdentifier } = await iam.send(
    new EnableOutboundWebIdentityFederationCommand({})
  )
  console.log('Setup: the account now issues tokens as', IssuerIdentifier)
} catch (err) {
  // It can only be switched on once, as on AWS, so a second run finds it on
  if (err.name !== 'FeatureEnabledException') throw err
  console.log('Setup: outbound web identity federation is already on')
}

// The admin UI's MSAL client. clientAssertion replaces a client secret: MSAL
// calls it whenever it needs to prove the app to Entra, which is steps 4-6
const sts = new STSClient(awsConfig)
const msal = new ConfidentialClientApplication({
  auth: {
    clientId,
    authority,
    knownAuthorities: ['localhost:4577'], // so MSAL doesn't look the authority up with Microsoft
    clientAssertion: async () => {
      // Step 4. "The Admin UI asks AWS STS for a web identity token":
      // STS GetWebIdentityToken, signed with the task's AWS credentials
      const { WebIdentityToken } = await sts.send(
        new GetWebIdentityTokenCommand({
          Audience: [audience],
          SigningAlgorithm: 'RS256',
          DurationSeconds: 300
        })
      )
      // Step 5. "STS returns a signed JWT"
      console.log('Step 5: STS returned a JWT for', decode(WebIdentityToken))
      return WebIdentityToken
    }
  }
})

// Step 1. "The user opens the Admin UI": they have no session, so the admin
// UI starts a sign-in

// Step 2. "The Admin UI redirects them to Entra ID to sign in":
// MSAL getAuthCodeUrl builds the authorize URL, with PKCE and state
const pkce = await new CryptoProvider().generatePkceCodes()
const state = 'state-the-admin-ui-keeps-in-its-session'
const authorizeUrl = await msal.getAuthCodeUrl({
  scopes: ['openid', 'profile'],
  redirectUri,
  codeChallenge: pkce.challenge,
  codeChallengeMethod: 'S256',
  state
})
console.log('Step 2: redirect the browser to', authorizeUrl.split('?')[0])

// Step 3. "Entra returns the auth code to the callback route": the browser
// follows the redirect, the user signs in (floci-az signs in its dev user
// without a form), and Entra redirects back with ?code=...&state=...
// Here, fetch plays the browser
const response = await fetch(authorizeUrl, { redirect: 'manual' })
const callback = new URL(response.headers.get('location'))
const code = callback.searchParams.get('code')
if (callback.searchParams.get('state') !== state) {
  throw new Error('state mismatch: not the sign-in this session started')
}
console.log('Step 3: the callback got a code for the session it started')

// Step 6. "The Admin UI exchanges the code plus that token (the client
// assertion) at Entra's token endpoint": MSAL acquireTokenByCode. It calls
// clientAssertion (steps 4-5) and sends the JWT as client_assertion, with
// client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
const result = await msal.acquireTokenByCode({
  code,
  redirectUri,
  codeVerifier: pkce.verifier,
  scopes: ['openid', 'profile']
})

// Step 7. "Entra returns the ID and access tokens, and a session is created":
// the admin UI would now put who the user is in its session cookie
const { name, preferred_username: username, iss } = result.idTokenClaims
console.log('Step 7: signed in as', { name, username, issuedBy: iss })
