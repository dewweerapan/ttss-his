// src/clients/apps/his/src/app/queue/display/page.tsx
// Public display board — no auth required. Open on a TV in the waiting room.
'use client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';

type QueueDisplayItem = { id: string; queueNo: string; status: number };
type QueueSummary = { waiting: number; called: number; serving: number; done: number };
type QueueDisplayResponse = { items: QueueDisplayItem[]; summary: QueueSummary };

const DIVISION_ID = 'div-opd';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

async function fetchQueue(): Promise<QueueDisplayResponse> {
  const res = await fetch(`${API_BASE}/api/queue/display?divisionId=${DIVISION_ID}`);
  if (!res.ok) throw new Error('Failed to fetch queue');
  return res.json();
}

export default function QueueDisplayPage() {
  const qc = useQueryClient();
  const [now, setNow] = useState('');

  // Clock
  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      setNow(d.toLocaleString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
    };
    fmt();
    const t = setInterval(fmt, 1000);
    return () => clearInterval(t);
  }, []);

  // Data
  const { data } = useQuery<QueueDisplayResponse>({
    queryKey: ['queue-display', DIVISION_ID],
    queryFn: fetchQueue,
    refetchInterval: 30000,
  });

  // SignalR (anonymous — no token)
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/queue`, {
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('QueueUpdated', () => {
      qc.invalidateQueries({ queryKey: ['queue-display'] });
    });

    connection.start()
      .then(() => connection.invoke('JoinDivision', DIVISION_ID))
      .catch(() => {});

    return () => { connection.stop(); };
  }, [qc]);

  const called = (data?.items ?? []).filter(i => i.status === 2);
  const serving = (data?.items ?? []).filter(i => i.status === 3);
  const waiting = (data?.items ?? []).filter(i => i.status === 1);
  const s = data?.summary;

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#f8fafc',
      display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: '#1e3a5f', padding: '20px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '3px solid #3b82f6',
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>คิวผู้ป่วย OPD</div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>TTSS Hospital Information System</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, color: '#93c5fd' }}>{now}</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '30px 40px', display: 'flex', gap: 30, flexDirection: 'column' }}>

        {/* Currently called / serving */}
        <div style={{ display: 'flex', gap: 20 }}>
          {/* Currently serving */}
          <div style={{
            flex: 1, background: '#14532d', border: '2px solid #22c55e',
            borderRadius: 16, padding: '24px 32px',
          }}>
            <div style={{ fontSize: 16, color: '#86efac', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
              กำลังตรวจ
            </div>
            {serving.length === 0 ? (
              <div style={{ fontSize: 48, color: '#4ade80', fontWeight: 800 }}>—</div>
            ) : (
              serving.map(item => (
                <div key={item.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 72, fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>
                    {item.queueNo}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Newly called */}
          <div style={{
            flex: 1, background: '#1e3a5f', border: '2px solid #3b82f6',
            borderRadius: 16, padding: '24px 32px',
          }}>
            <div style={{ fontSize: 16, color: '#93c5fd', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
              เรียกหมายเลข
            </div>
            {called.length === 0 ? (
              <div style={{ fontSize: 48, color: '#60a5fa', fontWeight: 800 }}>—</div>
            ) : (
              called.map(item => (
                <div key={item.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 72, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>
                    {item.queueNo}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Waiting queue list */}
        <div style={{
          background: '#1e293b', borderRadius: 16, padding: '20px 32px',
          border: '1px solid #334155',
        }}>
          <div style={{ fontSize: 16, color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 2 }}>
            คิวรอ ({waiting.length} คน)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {waiting.slice(0, 20).map(item => (
              <div key={item.id} style={{
                background: '#334155', borderRadius: 8, padding: '8px 20px',
                fontSize: 28, fontWeight: 700, color: '#f1f5f9',
                minWidth: 80, textAlign: 'center',
              }}>
                {item.queueNo}
              </div>
            ))}
            {waiting.length === 0 && (
              <div style={{ color: '#64748b', fontSize: 20 }}>ไม่มีคิวรอ</div>
            )}
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'รอ', value: s?.waiting ?? 0, color: '#fbbf24' },
            { label: 'เรียกแล้ว', value: s?.called ?? 0, color: '#60a5fa' },
            { label: 'กำลังตรวจ', value: s?.serving ?? 0, color: '#4ade80' },
            { label: 'เสร็จแล้ว', value: s?.done ?? 0, color: '#94a3b8' },
          ].map(c => (
            <div key={c.label} style={{
              flex: 1, background: '#1e293b', borderRadius: 12, padding: '16px 24px',
              border: `1px solid ${c.color}40`, textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 14, color: '#94a3b8' }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
