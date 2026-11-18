# Kiwanis website: go-live plan (November 2026)

## Where things stand (checked November 18, 2026)

| Piece | Status |
|---|---|
| New site | Live and working at https://kiwanis-winchester.pages.dev |
| Club GitHub | `Winchester-Kiwanis/kiwanis-winchester` (club-owned organization) |
| Cloudflare hosting | Still under Cameron's personal Cloudflare account, and still building from Cameron's personal GitHub copy (`darkdefined-spec/kiwanis-winchester`). This is why the site stopped picking up new content. |
| winvakiw.org | Still the old WordPress site. Domain and DNS are at **GoDaddy** (`ns31/ns32.domaincontrol.com`). |
| Club email (pres@, sec@) | Hosted at GoDaddy (`mail.winvakiw.org`). **Not touched by this plan.** |
| Laptop copy | 1 commit not yet on GitHub (autumn content), plus a few edits that were never saved. Review before pushing. |

## Key decision: no nameserver transfer

The domain stays at GoDaddy. Club email keeps working exactly as it does today.
We only **add** records in GoDaddy DNS (listed below). Nothing existing gets deleted.

## Steps

1. **Club identity.** Recover `winchesterkiwanis@outlook.com` (or create a new club address). Every club account uses this address.
2. **Password manager.** Free Bitwarden account under the club address. Every password goes here and nowhere else.
3. **Club Cloudflare account** under the club address. Create a Pages project connected to `Winchester-Kiwanis/kiwanis-winchester`, using the same build settings:
   - Build command: `npx @11ty/eleventy`
   - Output: `_site`
   - Production branch: `main`
   - Workers AI binding named `AI`
4. **Settings (environment variables)** in the new project. These are the names; the values are set during setup:
   - Secrets: `EDITOR_AUTH_SECRET`, `GITHUB_TOKEN`, `RESEND_API_KEY`
   - Text: `EDITOR_ALLOWED_EMAILS`, `ADMIN_ALLOWED_EMAILS`, `GITHUB_OWNER=Winchester-Kiwanis`, `GITHUB_REPO=kiwanis-winchester`, `GITHUB_BRANCH=main`, `EDITOR_EMAIL_FROM=Kiwanis Website <website@winvakiw.org>`, `EDITOR_COMMITTER_NAME=Kiwanis Website Editor`, `EDITOR_COMMITTER_EMAIL=website-editor@winvakiw.org`
   - Compare against the old project's list before switching, in case it has extra entries.
5. **Resend** (sends the login codes) under the club address. Add the domain `winvakiw.org`. Resend shows 3–4 DNS records to add at GoDaddy (step 6).
6. **GoDaddy DNS** (for whoever holds the GoDaddy login):
   - Add the Resend records exactly as Resend shows them. They only cover email *sending* for the website and do not affect pres@ or sec@.
   - In the new Cloudflare project, add the custom domain `www.winvakiw.org`. Cloudflare will show a **CNAME**: `www` → `kiwanis-winchester.pages.dev` (or the new project's address). At GoDaddy, change the existing `www` CNAME (currently pointing to `winvakiw.org`) to that value.
   - Set up GoDaddy **domain forwarding**: `winvakiw.org` → `https://www.winvakiw.org` (permanent 301). Do **not** change the `@` A record's mail-related settings or the MX record.
7. **Editors and admins.** Owners (always admin) are set in Cloudflare `ADMIN_ALLOWED_EMAILS` (currently Jim and the club email). Everyone else is added by an admin at `/admin/people/` (Manage People).
8. **Test.** Log in to `/admin/` and `/editor/` with an approved email and publish a test change.
9. **After launch: club GitHub login.** GitHub rejected the brand-new club Outlook at sign-up (Nov 18). Retry in a few days. Then: invite it as an Owner of `Winchester-Kiwanis`, update the organization's billing email to `winchesterkiwanisclub@outlook.com`, generate a new fine-grained key from the club account (this repo only, Contents read/write), replace `GITHUB_TOKEN` in Cloudflare, and delete Cameron's key.
10. **Hand over.** Jim (and one other officer) get the Bitwarden login. Cameron is removed from the club Cloudflare, GitHub organization ownership is confirmed with a club officer as owner, and the old personal Cloudflare project is deleted.
