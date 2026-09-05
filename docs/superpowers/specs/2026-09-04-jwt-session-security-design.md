# JWT Session Security Design

## Goal

Replace the browser-facing opaque session credential with short-lived signed JWT
access tokens, while retaining a server-side, revocable refresh session. This
keeps Discord OAuth2 unchanged and makes authentication immediately revocable.

## Scope

- Replace `jdr_hub_session` with two `HttpOnly` cookies:
  - `jdr_hub_access`: a signed access JWT, valid for 15 minutes, path `/api`;
  - `jdr_hub_refresh`: an opaque random credential, valid for at most seven
    idle days and thirty absolute days, path `/api/auth`.
- Require a valid access JWT **and** its live server-side session for `/me` and
  every future protected API route.
- Add `POST /auth/refresh`, rotating the refresh credential atomically before
  returning a replacement access JWT.
- Preserve strict OAuth `state`, PKCE, the fixed Discord callback, internal
  post-login redirects, CSRF origin checks, and generic public errors.
- Retire the legacy cookie at login and logout. Existing legacy sessions will
  require a fresh Discord login after deployment; no user data is removed.
- Add a server-side capability to revoke every session of one user for future
  account-security workflows.

This is limited to authentication and its direct security controls. It does
not introduce roles, a frontend dashboard, bearer tokens, cross-origin API
access, or a new dependency.

## Chosen architecture

Discord remains the identity provider, but its OAuth token is never persisted
or returned to the browser. After a successful callback, the API creates an
opaque refresh credential and stores only its SHA-256 digest with the existing
`sessions` row. The API creates the row's UUID itself and places that UUID in
the JWT `sid` claim; `sid` is an identifier, not a refresh secret.

The access token is a JWT signed with Hono's already-installed `hono/jwt`
helper and the fixed `HS256` algorithm. It carries only `sub` (local user UUID),
`sid` (session UUID), `iss` (the canonical `APP_ORIGIN`), `aud`
(`jdr-hub-api`), `iat`, `nbf`, `exp`, `jti`, and the constant
`token_use: "jdr-hub-access"`. It contains no Discord token, email, profile,
role, availability, or authorization decision. JWT payloads are signed but
not encrypted, so minimising claims is mandatory.

Every protected request first verifies the JWT with an explicit algorithm,
issuer, audience and time validation, then strictly validates its claim shape.
It then loads the `sessions` row from `sid`, confirms the user ID matches
`sub`, and checks revocation plus idle and absolute expiry. A valid signature
alone is never sufficient. Authorization remains resource-specific in later
modules; no role is trusted from a JWT claim.

## Token and key policy

`JWT_SIGNING_SECRET` is server-only and must be a base64url-encoded random
value representing at least 32 bytes. It is required in every environment and
must never be committed, logged, rendered, or copied into Docker images.
`JWT_PREVIOUS_SIGNING_SECRET` is optional and permits a controlled key
rotation grace period: verification tries the active key first and the previous
key second; the previous value must be removed after 15 minutes plus deployment
propagation. Signing always uses the active key. The two values must differ.

The implementation uses no dynamic algorithm, `none`, remote JWK URL, or
attacker-selected key ID. It uses fixed purpose and audience claims so a token
issued here cannot be used as a token for another JDR Hub purpose.

## Request flows

### Login callback

1. Verify and consume the OAuth `state`, exchange the code with PKCE, and
   upsert the minimal Discord identity as today.
2. Generate a 256-bit opaque refresh credential and a new session UUID; store
   only the credential digest, UUID, user ID and expiry/revocation fields.
3. Sign a 15-minute access JWT for the UUID and local user ID.
4. Set both cookies with `HttpOnly`, `SameSite=Lax`, `Secure` only in
   production, explicit `/api`-scoped paths, and bounded expiry. Clear the
   legacy cookie with the same security attributes.
5. Redirect only to the already validated internal `returnTo` path.

### Authenticated request

1. Read only `jdr_hub_access` from the cookie; never accept credentials in a
   query string, local storage, or an `Authorization` header for this web app.
2. Reject malformed, oversized, expired, future-issued, wrong-purpose,
   wrong-issuer, wrong-audience, wrong-algorithm, or invalid-signature JWTs
   with the existing generic `401` response.
3. Look up `sid`; reject a missing, revoked, expired, or subject-mismatched
   session with `401` and do not disclose the reason.
4. Slide only the server-side idle expiry, never past the absolute expiry.

### Refresh and logout

`POST /auth/refresh` requires the exact `Origin` equal to `APP_ORIGIN`. It
validates the opaque refresh cookie against its digest and server-side session,
then atomically revokes that row and creates a new refresh session before
setting both replacement cookies. Replaying the previous refresh cookie fails.

`POST /auth/logout` requires the same origin check, revokes the session named
by the refresh cookie when present, clears access, refresh and legacy cookies,
and returns `204`. A copied access JWT consequently fails immediately because
the server-side session is revoked.

## Cookie and CSRF policy

Cookies are deliberately used instead of browser storage so application
JavaScript cannot read authentication material. Cookie authentication retains
CSRF risk: every state-changing auth endpoint (`refresh` and `logout`) keeps a
strict origin check in addition to `SameSite=Lax`. Future state-changing API
routes must retain the project CSRF strategy; JWTs do not remove that
requirement.

The reverse proxy strips `/api` before requests reach Hono. Cookie `Path`
therefore uses the browser-visible paths `/api` and `/api/auth`, not Hono's
internal `/` and `/auth` paths.

## Data model and migration

No migration is required. The existing `sessions.id` UUID becomes the stable
non-secret `sid`; `token_digest` continues to store only the digest of the
opaque refresh credential. Repository creation supplies the UUID rather than
relying on a database-generated value. Existing rows remain intact but their
legacy browser cookies are rejected, forcing re-authentication.

## Acceptance and security tests

- Configuration rejects a missing, short, malformed, or duplicated JWT key.
- OAuth callback sets two secure cookies and neither response nor storage
  contains the raw refresh credential beyond the browser cookie.
- A valid JWT plus a live matching session authorises `/me`; tampering,
  expiration, future issue time, wrong issuer/audience/purpose, malformed
  claims and a mismatched `sid`/`sub` are rejected.
- Logout revokes the session so the still-unexpired access JWT cannot access
  `/me`.
- Refresh requires the trusted origin, rotates credentials, rejects replay,
  retains the absolute expiry cap, and does not reveal tokens in errors.
- Revocation of all sessions invalidates every access JWT for that user.
- Existing OAuth state replay, open redirect, missing authentication and
  generic-error tests remain green.

## Sources

- [Hono JWT helper](https://hono.dev/docs/helpers/jwt): explicit signing and
  verification algorithms plus `exp`, `nbf`, `iat`, `iss` and `aud`
  validation.
- [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725): pin acceptable
  algorithms, ensure key entropy, validate issuer/audience, and segregate JWT
  uses.
- `docs/security/security-requirements.md`: project requirements for OAuth,
  session expiry/revocation, CSRF, secrets and TDD.
