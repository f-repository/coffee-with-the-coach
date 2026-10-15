# Coffee with the Coach

iOS app (built with Expo / React Native) for booking a complimentary 30-minute
coaching coffee with a WPI Leadership coach. Coaches publish weekly hours in
the app; times that clash with their Google Calendar are hidden automatically.

Designs: [Figma](https://www.figma.com/design/FwOoSXkBAIg281Ukr756oq/Untitled?node-id=0-1)

## Status

- **Customer booking flow**: the four screens from Figma.
- **Coach area** (*Are you a coach? Sign in*): Google sign-in, weekly repeating
  hours, booking rules (buffer, notice, horizon), removing single slots, the day
  agenda with booking details, and cancelling bookings.
- **Backend** (`supabase/`): database, security rules and server functions. A
  booked slot is removed immediately, two people can never book the same slot,
  and anything on the coach's Google Calendar hides the slots it overlaps.
  Bookings are added to the coach's calendar with a Google Meet link and an
  invite to the customer.

The app uses sample data until the backend is connected. Follow
**[SETUP.md](SETUP.md)** to connect it.

## Try it on your iPhone

1. Install **Expo Go** from the App Store.
2. On a computer with Node.js 20+:
   ```bash
   npm install
   npx expo start
   ```
3. Scan the QR code with the iPhone camera.

## Project layout

```
src/app/          Screens (Expo Router: each file is a route)
  index.tsx       Welcome
  time.tsx        Choose a coffee time
  details.tsx     Your details and coaching topic
  confirmed.tsx   Your coffee is booked
src/api/          Customer API (Supabase functions, or sample data)
src/coach/        Coach session, data access and shared coach UI
src/app/coach/    Coach screens: sign-in, Calendar, Availability, Profile
src/booking/      Booking flow state
src/components/   Shared UI (buttons, progress, cards, brand)
src/lib/time.ts   Timezone helpers (slots are stored in UTC)
src/theme.ts      Colors and fonts from Figma
supabase/
  migrations/     Database tables and security rules
  functions/      Server functions (coaches, availability, book, google-connect, cancel-booking)
  functions/_shared/slots.ts   Turns weekly hours into bookable slots
```

## Brand images

The WPI logo and the coffee hero photo still need to be exported from Figma.
Save them as `assets/brand/wpi-logo.png` and `assets/brand/hero-coffee.png`, then
point the two constants at the top of `src/components/Brand.tsx` at them.

## Checks

```bash
npm run typecheck        # app
npm run typecheck:server # server functions
npm test                 # slot logic tests
supabase/tests/run.sh    # database security tests (needs local Postgres)
```
