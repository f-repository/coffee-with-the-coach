import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeSlots, isOffered, type SlotInput } from './slots.ts';

const NY = 'America/New_York';

// Thursday 15 Oct 2026, 08:00 in New York (12:00 UTC).
const NOW = new Date('2026-10-15T12:00:00Z');

function input(overrides: Partial<SlotInput> = {}): SlotInput {
  return {
    timeZone: NY,
    sessionMinutes: 30,
    bufferMinutes: 0,
    minNoticeHours: 0,
    bookingWindowDays: 14,
    rules: [{ weekday: 2, start_time: '09:00', end_time: '11:00', starts_on: '2026-01-01', ends_on: null }],
    exceptions: [],
    bookings: [],
    busy: [],
    now: NOW,
    ...overrides,
  };
}

const starts = (s: { start: string }[]) => s.map((x) => x.start);

test('slices a weekly window into back-to-back sessions in the coach timezone', () => {
  const slots = computeSlots(input());
  // Tuesdays 20 and 27 Oct, 09:00-11:00 EDT = 13:00-15:00 UTC.
  assert.deepEqual(starts(slots), [
    '2026-10-20T13:00:00.000Z',
    '2026-10-20T13:30:00.000Z',
    '2026-10-20T14:00:00.000Z',
    '2026-10-20T14:30:00.000Z',
    '2026-10-27T13:00:00.000Z',
    '2026-10-27T13:30:00.000Z',
    '2026-10-27T14:00:00.000Z',
    '2026-10-27T14:30:00.000Z',
  ]);
  assert.equal(slots[0].end, '2026-10-20T13:30:00.000Z');
});

test('follows daylight saving time: 09:00 stays 09:00 local after clocks change', () => {
  const slots = computeSlots(input({ bookingWindowDays: 21 }));
  // 3 Nov 2026 is after DST ends (1 Nov): 09:00 EST = 14:00 UTC.
  assert.ok(starts(slots).includes('2026-11-03T14:00:00.000Z'));
  assert.ok(!starts(slots).includes('2026-11-03T13:00:00.000Z'));
});

test('a booked slot is no longer offered', () => {
  const slots = computeSlots(input({ bookings: [{ start: '2026-10-20T13:30:00Z', end: '2026-10-20T14:00:00Z' }] }));
  assert.ok(!isOffered(slots, '2026-10-20T13:30:00Z'));
  assert.ok(isOffered(slots, '2026-10-20T13:00:00Z'));
  assert.ok(isOffered(slots, '2026-10-20T14:00:00Z'));
});

test('a Google Calendar event hides every slot it overlaps', () => {
  // A 09:45-10:15 meeting overlaps the 09:30 and 10:00 slots.
  const slots = computeSlots(input({ busy: [{ start: '2026-10-20T13:45:00Z', end: '2026-10-20T14:15:00Z' }] }));
  const tue = starts(slots).filter((s) => s.startsWith('2026-10-20'));
  assert.deepEqual(tue, ['2026-10-20T13:00:00.000Z', '2026-10-20T14:30:00.000Z']);
});

test('an event that only touches a slot edge does not hide it', () => {
  const slots = computeSlots(input({ busy: [{ start: '2026-10-20T12:00:00Z', end: '2026-10-20T13:00:00Z' }] }));
  assert.ok(isOffered(slots, '2026-10-20T13:00:00Z'));
});

test('buffer spaces sessions apart and keeps a gap around busy time', () => {
  const spaced = computeSlots(input({ bufferMinutes: 15 }));
  const tue = starts(spaced).filter((s) => s.startsWith('2026-10-20'));
  // 09:00, 09:45, 10:30 (10:30-11:00 still fits).
  assert.deepEqual(tue, ['2026-10-20T13:00:00.000Z', '2026-10-20T13:45:00.000Z', '2026-10-20T14:30:00.000Z']);

  // An event ending 09:50 blocks 09:45 directly, and its 15 min buffer reaches 10:05,
  // which doesn't touch 10:30.
  const blocked = computeSlots(input({ bufferMinutes: 15, busy: [{ start: '2026-10-20T13:20:00Z', end: '2026-10-20T13:50:00Z' }] }));
  assert.deepEqual(
    starts(blocked).filter((s) => s.startsWith('2026-10-20')),
    ['2026-10-20T14:30:00.000Z'],
  );
});

test('a removed single occurrence disappears but the series continues', () => {
  const slots = computeSlots(input({ exceptions: ['2026-10-20T13:00:00Z'] }));
  assert.ok(!isOffered(slots, '2026-10-20T13:00:00Z'));
  assert.ok(isOffered(slots, '2026-10-27T13:00:00Z'));
});

test('minimum notice and booking window limit how close and how far ahead', () => {
  // Rule today (Thursday) 09:00-11:00; it's 08:00 now.
  const rules = [{ weekday: 4, start_time: '09:00', end_time: '11:00', starts_on: '2026-01-01', ends_on: null }];
  const soon = computeSlots(input({ rules, minNoticeHours: 2, bookingWindowDays: 8 }));
  // Today only 10:00 and 10:30 are 2+ hours away; next Thursday is within the window.
  assert.deepEqual(
    starts(soon).filter((s) => s.startsWith('2026-10-15')),
    ['2026-10-15T14:00:00.000Z', '2026-10-15T14:30:00.000Z'],
  );
  assert.ok(isOffered(soon, '2026-10-22T13:00:00Z'));
  const short = computeSlots(input({ rules, bookingWindowDays: 3 }));
  assert.ok(!isOffered(short, '2026-10-22T13:00:00Z'));
});

test('rule start and end dates are respected', () => {
  const rules = [{ weekday: 2, start_time: '09:00', end_time: '09:30', starts_on: '2026-10-21', ends_on: '2026-11-01' }];
  const slots = computeSlots(input({ rules, bookingWindowDays: 30 }));
  assert.deepEqual(starts(slots), ['2026-10-27T13:00:00.000Z']);
});

test('overlapping rules do not create duplicate slots', () => {
  const rules = [
    { weekday: 2, start_time: '09:00', end_time: '10:00', starts_on: '2026-01-01', ends_on: null },
    { weekday: 2, start_time: '09:30', end_time: '10:30', starts_on: '2026-01-01', ends_on: null },
  ];
  const slots = computeSlots(input({ rules, bookingWindowDays: 6 }));
  assert.deepEqual(starts(slots), [
    '2026-10-20T13:00:00.000Z',
    '2026-10-20T13:30:00.000Z',
    '2026-10-20T14:00:00.000Z',
  ]);
});
