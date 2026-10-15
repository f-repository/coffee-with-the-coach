# Connecting the real backend

Until these steps are done the app runs on sample data. Allow about 30–45 minutes.
You'll create two free accounts (Supabase and Google Cloud), then run a few
commands on your Mac from the project folder.

## 1. Create the Supabase project

1. Sign up at https://supabase.com and click **New project**. Name it
   `coffee-with-the-coach`, pick a strong database password (save it), and
   choose the region closest to you.
2. When it's ready, open **Project Settings → API** and note:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key
   - The **project ref**: the `abcd1234` part of the URL

## 2. Create the Google sign-in and Calendar access

1. Go to https://console.cloud.google.com, create a project called
   `Coffee with the Coach`.
2. **APIs & Services → Library**: search for **Google Calendar API** and click **Enable**.
3. **APIs & Services → OAuth consent screen** (also called **Google Auth Platform**):
   - **User type**: choose **Internal** if every coach uses a WPI Google
     Workspace account. Choose **External** if any coach uses a personal Gmail.
   - App name `Coffee with the Coach`, your email as support and developer contact.
   - **Scopes**: add `.../auth/calendar.events` and `.../auth/calendar.freebusy`.
   - If **External**: add each coach's email under **Test users**. See the
     note at the bottom about publishing.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Save the **Client ID** and **Client secret**.

## 3. Turn on Google sign-in in Supabase

1. Supabase → **Authentication → Sign In / Providers → Google**: enable it and
   paste the Client ID and Client secret.
2. Supabase → **Authentication → URL Configuration → Redirect URLs**, add:
   - `exp://**` (Expo Go during development)
   - `coffeewiththecoach://**` (the installed app later)

## 4. Deploy the database and server functions

In Terminal, from the project folder:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
npx supabase secrets set GOOGLE_CLIENT_ID=<client id> GOOGLE_CLIENT_SECRET=<client secret>
npx supabase functions deploy coaches availability book google-connect cancel-booking
```

`db push` asks for the database password from step 1.

## 5. Point the app at the backend

Create a file called `.env` in the project folder (it is not committed to git):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Restart with `npx expo start`. The anon key is safe to ship in the app; the
Google secret and service key live only in Supabase.

## 6. Set up each coach

On the phone, open the app → **Are you a coach? Sign in** → **Continue with Google**,
and allow calendar access. Then:

1. **Profile**: check the name, first name, title and timezone.
2. **Availability**: add weekly hours, for example Tue and Thu 09:00–11:00.
3. **Profile**: switch on **Accepting bookings**.

The coach now appears on the welcome screen, and customers can book.

## Note: Google "Testing" mode

With **External** user type, Google keeps the app in *Testing* mode until it's
verified, and **sign-ins expire after 7 days**. In that case coaches would have
to sign in again weekly. To avoid that, either:
- use **Internal** (Workspace accounts only, no verification needed), or
- click **Publish app** on the consent screen and complete Google's verification
  for the calendar scopes (takes a few days to a few weeks).
