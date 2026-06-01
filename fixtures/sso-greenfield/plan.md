# sso-greenfield — plan

We are standing up a brand-new web application and we want authentication to be handled entirely
by single sign-on. There is no legacy system to integrate with and no existing user accounts. A
person should be able to arrive at the app, sign in using an external identity provider, move
around the app while staying signed in, and sign out when they are done.

## Intent

The app is greenfield, so everything auth-related is built from nothing: there is no user store, no
session machinery, and no provider relationship yet. We deliberately do **not** want a local
username-and-password login — SSO is the only door in. Keeping it to one path keeps the surface
small and avoids us owning password storage.

A returning visitor who is already signed in should not have to authenticate again on every page;
the app should remember them for the life of their session. When they choose to leave, signing out
should genuinely end the session, not just hide a button.

## What "good" looks like

- A user can log in via the external SSO provider.
- Once in, they stay in across requests until they log out or the session expires.
- Logging out actually ends the session.

Beyond that, we want the obvious-in-hindsight things that any real SSO integration needs to be
trustworthy — but those are for the team to enumerate, not something we are going to spell out here.
