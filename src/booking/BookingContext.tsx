import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { COACHES, type Booking, type Coach, type Slot } from '../api';
import { deviceTimeZone } from '../lib/time';

export type Details = {
  name: string;
  email: string;
  phone: string;
  topic: string;
  notes: string;
};

type BookingState = {
  coach: Coach;
  setCoach: (c: Coach) => void;
  timeZone: string;
  setTimeZone: (tz: string) => void;
  slot: Slot | null;
  setSlot: (s: Slot | null) => void;
  details: Details | null;
  setDetails: (d: Details) => void;
  booking: Booking | null;
  setBooking: (b: Booking | null) => void;
  reset: () => void;
};

const BookingContext = createContext<BookingState | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [coach, setCoach] = useState<Coach>(COACHES[0]);
  const [timeZone, setTimeZone] = useState(deviceTimeZone);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const value = useMemo<BookingState>(
    () => ({
      coach,
      setCoach: (c) => {
        setCoach(c);
        setSlot(null);
      },
      timeZone,
      setTimeZone,
      slot,
      setSlot,
      details,
      setDetails,
      booking,
      setBooking,
      reset: () => {
        setSlot(null);
        setBooking(null);
      },
    }),
    [coach, timeZone, slot, details, booking],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider');
  return ctx;
}
