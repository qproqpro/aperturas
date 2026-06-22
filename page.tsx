'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import KpiGrid from '@/components/KpiGrid';
import TopStaff from '@/components/TopStaff';
import ActivityCharts from '@/components/ActivityCharts';
import LongestSessions from '@/components/LongestSessions';
import RecentSessions from '@/components/RecentSessions';
import styles from './page.module.css';

export type Stats = {
  totalSessions: number;
  avgDuration: number;
  avgVotes: number;
  maxDuration: number;
  topStaff: { id: string; name: string; count: number; avatar?: string }[];
  longestSessions: {
    id: string; opened_by: string; opened_at: string; closed_at: string;
    duration_min: number; votes_now: number; votes_later: number; votes_staff: number;
  }[];
  earliestOpening: { hour: number; minute: number; opened_by: string } | null;
  byDow: number[];
  byHourOfDay: number[];
  recentSessions: {
    id: string; opened_by: string; opened_at: string; closed_at: string;
    duration_min: number; votes_now: number; votes_later: number; votes_staff: number;
  }[];
  lastUpdated: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Error cargando estadísticas');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className={styles.loader}>
      <div className={styles.loaderInner}>
        <div className={styles.loaderDot} />
        <div className={styles.loaderDot} />
        <div className={styles.loaderDot} />
      </div>
      <p>Cargando estadísticas...</p>
    </div>
  );

  if (error || !stats) return (
    <div className={styles.loader}>
      <p style={{ color: 'var(--red)' }}>⚠ {error || 'Sin datos'}</p>
    </div>
  );

  return (
    <main className={styles.main}>
      <Header lastUpdated={stats.lastUpdated} onRefresh={fetchStats} />
      <div className={styles.content}>
        <KpiGrid stats={stats} />
        <div className={styles.row}>
          <TopStaff staff={stats.topStaff} />
          <LongestSessions sessions={stats.longestSessions} />
        </div>
        <ActivityCharts byDow={stats.byDow} byHour={stats.byHourOfDay} />
        <RecentSessions sessions={stats.recentSessions} />
      </div>
    </main>
  );
}
