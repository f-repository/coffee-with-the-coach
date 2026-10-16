export type Coach = {
  id: string;
  name: string;
  firstName: string;
  credential: string;
  timeZone: string;
  sessionMinutes: number;
};

/** An open appointment slot. Times are ISO-8601 UTC strings. */
export type Slot = { start: string; end: string };

export type BookingRequest = {
  coachId: string;
  /** Session length the customer chose, in minutes. */
  durationMinutes: number;
  slot: Slot;
  timeZone: string;
  name: string;
  email: string;
  phone?: string;
  topic: string;
  notes?: string;
};

export type Booking = {
  reference: string;
  meetLink?: string;
};
