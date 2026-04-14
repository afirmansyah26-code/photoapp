'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalDokumentasi: number;
  totalFoto: number;
  bulanIni: number;
}

interface RecentDoc {
  id: number;
  tanggal: string;
  guru_name: string;
  nama_kegiatan: string;
  video_url: string;
  collage_url: string;
  foto_count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalDokumentasi: 0, totalFoto: 0, bulanIni: 0 });
  const [recent, setRecent] = useState<RecentDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch stats and recent docs in parallel
      const [statsRes, recentRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/dokumentasi?limit=6'),
      ]);

      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats({
          totalDokumentasi: statsData.data.totalDokumentasi,
          totalFoto: statsData.data.totalFoto,
          bulanIni: statsData.data.bulanIni,
        });
      }

      const recentData = await recentRes.json();
      if (recentData.success) {
        setRecent(recentData.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const statCards = [
    {
      label: 'Total Dokumentasi',
      value: stats.totalDokumentasi,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      gradient: 'from-primary-500 to-primary-700',
      shadow: 'shadow-primary-500/20',
    },
    {
      label: 'Total Foto',
      value: stats.totalFoto,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: 'from-accent to-accent-light',
      shadow: 'shadow-accent/20',
    },
    {
      label: 'Bulan Ini',
      value: stats.bulanIni,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-secondary to-secondary-light',
      shadow: 'shadow-secondary/20',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-lg ${card.shadow} hover:scale-[1.02] transition-transform duration-200`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">{card.label}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <div className="p-2 bg-white/20 rounded-xl">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">Dokumentasi Terbaru</h2>
          <Link
            href="/dashboard/dokumentasi"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            Lihat semua
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-dim rounded-2xl mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
              </svg>
            </div>
            <h3 className="font-semibold text-text mb-1">Belum ada dokumentasi</h3>
            <p className="text-sm text-text-secondary mb-4">Mulai tambahkan dokumentasi pembelajaran pertama Anda</p>
            <Link
              href="/dashboard/dokumentasi/baru"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Dokumentasi
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {recent.map((doc) => (
              <Link
                key={doc.id}
                href={`/dashboard/dokumentasi/${doc.id}`}
                className="group bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all duration-300"
              >
                <div className="aspect-video bg-surface-dim relative overflow-hidden">
                  {doc.collage_url ? (
                    <img
                      src={doc.collage_url}
                      alt={`Kolase ${doc.nama_kegiatan}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    {doc.video_url && (
                      <div className="bg-red-600/90 backdrop-blur-sm text-white text-xs px-1.5 py-1 rounded-lg flex items-center gap-1" title="Ada Video">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                          <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white"/>
                        </svg>
                      </div>
                    )}
                    <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                      {doc.foto_count}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-text-muted">{formatDate(doc.tanggal)}</span>
                  </div>
                  <h3 className="font-semibold text-text text-sm group-hover:text-primary-700 transition-colors truncate">{doc.nama_kegiatan || 'Dokumentasi'}</h3>
                  <p className="text-xs text-text-secondary mt-1">{doc.guru_name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
