import { prisma } from './prisma';
import type { Doctor } from '@prisma/client';

export const SERVICES = [
  'General Consultation',
  'Follow-up',
  'Specialist Visit',
  'Lab Results Review',
  'Prescription Renewal',
];

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

interface BreakConfig {
  enabled: boolean;
  start: string;
  end: string;
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  breakTime?: BreakConfig | null
): string[] {
  const slots: string[] = [];
  let cur = toMinutes(startTime);
  const end = toMinutes(endTime);
  const breakStart = breakTime?.enabled ? toMinutes(breakTime.start) : null;
  const breakEnd = breakTime?.enabled ? toMinutes(breakTime.end) : null;

  while (cur + durationMinutes <= end) {
    if (breakStart !== null && breakEnd !== null && cur < breakEnd && cur + durationMinutes > breakStart) {
      cur = breakEnd;
      continue;
    }
    slots.push(`${pad(Math.floor(cur / 60))}:${pad(cur % 60)}`);
    cur += durationMinutes;
  }
  return slots;
}

// ─── Google Calendar free/busy lookup ─────────────────────────────────────────
async function getGoogleBusySlots(calendarId: string, date: string): Promise<{ start: string; end: string }[]> {
  try {
    const { google } = await import('./google');
    const timeMin = new Date(`${date}T00:00:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59`).toISOString();
    const response = await google.freebusy.query({
      requestBody: { timeMin, timeMax, items: [{ id: calendarId }] },
    });
    return (response.data.calendars?.[calendarId]?.busy ?? []) as { start: string; end: string }[];
  } catch {
    return [];
  }
}

// ─── Main availability function ───────────────────────────────────────────────
interface SlotsResult {
  available: string[];
  all: string[];
  reason?: string;
  holidayName?: string;
  blockedTimes?: string[];
}

export async function getAvailableSlots(doctor: Doctor, date: string): Promise<SlotsResult> {
  const dayOfWeek = new Date(date).getDay();

  // Check weekly holiday
  const weeklyHoliday = await prisma.holiday.findFirst({
    where: {
      type: 'weekly',
      dayOfWeek,
      OR: [
        { applyToAll: true },
        { doctors: { some: { doctorId: doctor.id } } },
      ],
    },
  });
  if (weeklyHoliday) {
    return { available: [], all: [], reason: 'holiday', holidayName: weeklyHoliday.nameEn };
  }

  // Check specific date holiday
  const dateHoliday = await prisma.holiday.findFirst({
    where: {
      type: 'date',
      date,
      OR: [
        { applyToAll: true },
        { doctors: { some: { doctorId: doctor.id } } },
      ],
    },
  });
  if (dateHoliday) {
    return { available: [], all: [], reason: 'holiday', holidayName: dateHoliday.nameEn };
  }

  // Check working days
  if (!doctor.workingDays.includes(dayOfWeek)) {
    return { available: [], all: [], reason: 'notWorkingDay' };
  }

  const allSlots = generateTimeSlots(
    doctor.workingStart,
    doctor.workingEnd,
    doctor.slotDuration,
    doctor.breakEnabled
      ? { enabled: true, start: doctor.breakStart, end: doctor.breakEnd }
      : null
  );

  const [dbBookings, blockedSlots] = await Promise.all([
    prisma.booking.findMany({
      where: { doctorId: doctor.id, date, status: { notIn: ['cancelled'] } },
      select: { time: true },
    }),
    prisma.blockedSlot.findMany({
      where: { doctorId: doctor.id, date },
    }),
  ]);

  const dbBusy = new Set(dbBookings.map((b) => b.time));
  const isWholeDay = blockedSlots.some((s) => s.isWholeDay);
  const blockedTimes = new Set(
    blockedSlots.filter((s) => !s.isWholeDay && s.time).map((s) => s.time as string)
  );

  if (isWholeDay) {
    return { available: [], all: allSlots, reason: 'blocked' };
  }

  const googleBusy = await getGoogleBusySlots(doctor.calendarId, date);

  const available = allSlots.filter((slot) => {
    if (dbBusy.has(slot) || blockedTimes.has(slot)) return false;
    const ss = new Date(`${date}T${slot}:00`);
    const se = new Date(ss.getTime() + doctor.slotDuration * 60000);
    return !googleBusy.some((b) => ss < new Date(b.end) && se > new Date(b.start));
  });

  return { available, all: allSlots, blockedTimes: [...blockedTimes] };
}

export async function suggestAlternativeDates(
  doctor: Doctor,
  fromDate: string,
  daysAhead = 7
): Promise<{ date: string; availableCount: number }[]> {
  const suggestions: { date: string; availableCount: number }[] = [];
  const start = new Date(fromDate);

  for (let i = 1; i <= daysAhead && suggestions.length < 3; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const { available } = await getAvailableSlots(doctor, dateStr);
    if (available.length > 0) {
      suggestions.push({ date: dateStr, availableCount: available.length });
    }
  }

  return suggestions;
}
