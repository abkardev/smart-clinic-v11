export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { apiResponse } from '@/app/lib/apiResponse';
import { BookingStatus, BookingSource } from '@prisma/client';

export async function GET(_req: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7);

    const [
      totalBookings,
      todayBookings,
      monthBookings,
      pendingCount,
      confirmedCount,
      noShowCount,
      cancelledCount,
      completedCount,
      totalDoctors,
      whatsappBookings,
      recentBookings,
      byDoctorRaw,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { date: today } }),
      prisma.booking.count({ where: { date: { startsWith: thisMonth } } }),
      prisma.booking.count({ where: { status: BookingStatus.pending } }),
      prisma.booking.count({ where: { status: BookingStatus.confirmed } }),
      prisma.booking.count({ where: { status: BookingStatus.no_show } }),
      prisma.booking.count({ where: { status: BookingStatus.cancelled } }),
      prisma.booking.count({ where: { status: BookingStatus.completed } }),
      prisma.doctor.count({ where: { isActive: true } }),
      prisma.booking.count({ where: { source: BookingSource.whatsapp } }),
      prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: { select: { id: true, nameEn: true, nameAr: true, specialtyEn: true, specialtyAr: true } },
        },
      }),
      prisma.booking.groupBy({
        by: ['doctorId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const doctorIds = byDoctorRaw.map((r) => r.doctorId);
    const doctors = await prisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, nameEn: true, nameAr: true },
    });
    const doctorMap = Object.fromEntries(doctors.map((d) => [d.id, d]));

    const byDoctor = byDoctorRaw.map((r) => ({
      doctorId: r.doctorId,
      doctorNameEn: doctorMap[r.doctorId]?.nameEn ?? '—',
      doctorNameAr: doctorMap[r.doctorId]?.nameAr ?? '—',
      count: r._count.id,
    }));

    const recentShaped = recentBookings.map(({ doctor, ...b }) => ({
      ...b,
      doctorId: doctor,
    }));

    return apiResponse({
      totalBookings,
      todayBookings,
      monthBookings,
      totalDoctors,
      whatsappBookings,
      instagramBookings: 0,
      statusBreakdown: {
        pending: pendingCount,
        confirmed: confirmedCount,
        'no-show': noShowCount,
        cancelled: cancelledCount,
        completed: completedCount,
      },
      recentBookings: recentShaped,
      byDoctor,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
