import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const sessions = db.collection('sessions');

    const allSessions = await sessions.find({}).sort({ opened_at: -1 }).toArray();

    // ── Top staff que más abrieron ──
    const staffCount: Record<string, { count: number; name: string; avatar?: string }> = {};
    for (const s of allSessions) {
      if (s.opened_by) {
        const key = s.opened_by.id;
        if (!staffCount[key]) staffCount[key] = { count: 0, name: s.opened_by.name, avatar: s.opened_by.avatar };
        staffCount[key].count++;
      }
    }
    const topStaff = Object.entries(staffCount)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Sesiones más largas ──
    const withDuration = allSessions
      .filter(s => s.opened_at && s.closed_at)
      .map(s => ({
        id: s._id.toString(),
        opened_by: s.opened_by?.name || 'Desconocido',
        opened_at: s.opened_at,
        closed_at: s.closed_at,
        duration_min: Math.round((new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000),
        votes_now: s.votes?.me_uno?.length || 0,
        votes_later: s.votes?.me_despues?.length || 0,
        votes_staff: s.votes?.me_mod?.length || 0,
      }))
      .sort((a, b) => b.duration_min - a.duration_min);

    const longestSessions = withDuration.slice(0, 5);

    // ── Sesión más temprana (por hora del día) ──
    const byHour = allSessions
      .filter(s => s.opened_at)
      .map(s => {
        const d = new Date(s.opened_at);
        return { hour: d.getHours(), minute: d.getMinutes(), opened_by: s.opened_by?.name };
      })
      .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

    const earliestOpening = byHour[0] || null;

    // ── Aperturas por día de la semana ──
    const byDow = [0, 0, 0, 0, 0, 0, 0];
    for (const s of allSessions) {
      if (s.opened_at) byDow[new Date(s.opened_at).getDay()]++;
    }

    // ── Aperturas por hora del día ──
    const byHourOfDay = Array(24).fill(0);
    for (const s of allSessions) {
      if (s.opened_at) byHourOfDay[new Date(s.opened_at).getHours()]++;
    }

    // ── Últimas 30 sesiones ──
    const recentSessions = withDuration.slice(0, 30);

    // ── KPIs globales ──
    const totalSessions = allSessions.length;
    const avgDuration = withDuration.length
      ? Math.round(withDuration.reduce((a, b) => a + b.duration_min, 0) / withDuration.length)
      : 0;
    const avgVotes = allSessions.length
      ? Math.round(allSessions.reduce((a, s) => a + ((s.votes?.me_uno?.length || 0) + (s.votes?.me_despues?.length || 0)), 0) / allSessions.length)
      : 0;
    const maxDuration = withDuration[0]?.duration_min || 0;

    return NextResponse.json({
      totalSessions,
      avgDuration,
      avgVotes,
      maxDuration,
      topStaff,
      longestSessions,
      earliestOpening,
      byDow,
      byHourOfDay,
      recentSessions,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
  }
}
