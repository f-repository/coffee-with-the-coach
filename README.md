# Coffee with the Coach

iOS app (built with Expo / React Native) for booking a complimentary 30-minute
coaching coffee with a WPI Leadership coach. Available times come from the
coach's Google Calendar.

Designs: [Figma](https://www.figma.com/design/FwOoSXkBAIg281Ukr756oq/Untitled?node-id=0-1)

## Status

**Milestone 1 (this build)**: the four customer screens (welcome, choose a time,
your details, confirmation), matched to the Figma designs and running on
**sample availability** (`src/api/index.ts`). No real bookings are made yet.

Next:
2. Backend that reads the coach's Google Calendar free/busy, applies availability
   rules, and creates the event with a Google Meet link and guest invite.
3. Coach screen: calendar connection, availability rules, day agenda.

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
src/api/          Booking API (mock for now; swap for backend calls)
src/booking/      Booking flow state
src/components/   Shared UI (buttons, progress, cards, brand)
src/lib/time.ts   Timezone helpers (slots are stored in UTC)
src/theme.ts      Colors and fonts from Figma
```

## Brand images

The WPI logo and the coffee hero photo still need to be exported from Figma.
Save them as `assets/brand/wpi-logo.png` and `assets/brand/hero-coffee.png`, then
point the two constants at the top of `src/components/Brand.tsx` at them.

## Checks

```bash
npm run typecheck
```
