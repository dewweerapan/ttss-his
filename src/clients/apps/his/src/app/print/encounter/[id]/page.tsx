// src/clients/apps/his/src/app/print/encounter/[id]/page.tsx
// Print-friendly OPD encounter summary — no nav, auto-print on load
'use client';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type VitalSignInfo = {
  temperature?: number; pulseRate?: number; respiratoryRate?: number;
  bpSystolic?: number; bpDiastolic?: number; o2Sat?: number;
  weight?: number; height?: number; recordedDate: string;
};
type DiagnosisInfo = {
  id: string; type: number; icd10Code?: string; icd10Name?: string;
  description?: string; isConfirmed: boolean;
};
type DrugOrderLineItem = {
  id: string; productId: string; productName: string;
  quantity: number; frequency: string; durationDays: number;
  instruction?: string; unit?: string;
};
type DrugOrderSummary = { id: string; orderNo: string; status: number; orderDate: string; items: DrugOrderLineItem[] };
type EncounterDetail = {
  id: string; encounterNo: string; status: number; type: number;
  chiefComplaint?: string; admissionDate: string; dischargeDate?: string;
  doctorId?: string;
  patient: { id: string; hn: string; preName?: string; firstName: string; lastName: string; birthdate?: string; phoneNumber?: string; allergy?: string; allergyNote?: string };
  latestVitals?: VitalSignInfo;
  diagnoses: DiagnosisInfo[];
};

const DIAG_TYPE: Record<number, string> = { 1: 'Principal Dx', 2: 'Comorbidity', 3: 'Complication', 4: 'Rule Out' };

function age(birthdate?: string): string {
  if (!birthdate) return '-';
  const y = new Date().getFullYear() - new Date(birthdate).getFullYear();
  return `${y} ปี`;
}

export default function PrintEncounterPage() {
  const { id } = useParams<{ id: string }>();

  const { data: enc, isLoading: encLoading } = useQuery({
    queryKey: ['print-encounter', id],
    queryFn: () => api.get<EncounterDetail>(`/api/encounters/${id}`),
    enabled: !!id,
  });

  const { data: drugOrders = [] } = useQuery({
    queryKey: ['print-drug-orders', id],
    queryFn: () => api.get<DrugOrderSummary[]>(`/api/encounters/${id}/drug-orders`),
    enabled: !!id,
  });

  // Auto-print once everything is loaded
  const ready = !encLoading && enc;
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (encLoading || !enc) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>กำลังโหลด...</div>;
  }

  const p = enc.patient;
  const fullName = `${p.preName ?? ''}${p.firstName} ${p.lastName}`;
  const dateStr = new Date(enc.admissionDate).toLocaleDateString('th-TH', { dateStyle: 'long' });
  const timeStr = new Date(enc.admissionDate).toLocaleTimeString('th-TH', { timeStyle: 'short' });
  const v = enc.latestVitals;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#111', padding: '20mm 20mm', maxWidth: 210, margin: '0 auto' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 8px; border: 1px solid #ccc; font-size: 12px; }
        th { background: #f0f0f0; text-align: left; }
        h2 { margin: 0 0 4px; }
        h3 { margin: 12px 0 6px; border-bottom: 1px solid #aaa; padding-bottom: 2px; }
        .row { display: flex; gap: 12px; }
        .label { color: #555; min-width: 80px; }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{ marginBottom: 16 }}>
        <button onClick={() => window.print()} style={{ padding: '6px 16px', cursor: 'pointer' }}>พิมพ์</button>
        <button onClick={() => window.close()} style={{ marginLeft: 8, padding: '6px 16px', cursor: 'pointer' }}>ปิด</button>
      </div>

      {/* Hospital header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 8, marginBottom: 12 }}>
        <h2>TTSS HOSPITAL</h2>
        <div style={{ fontSize: 14 }}>สรุปผลการตรวจ OPD — {enc.encounterNo}</div>
        <div style={{ fontSize: 12, color: '#555' }}>{dateStr} เวลา {timeStr} น.</div>
      </div>

      {/* Patient info */}
      <h3>ข้อมูลผู้ป่วย</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
        <div><span className="label">HN:</span> <strong>{p.hn}</strong></div>
        <div><span className="label">ชื่อ-สกุล:</span> {fullName}</div>
        <div><span className="label">อายุ:</span> {age(p.birthdate)}</div>
        <div><span className="label">โทร:</span> {p.phoneNumber ?? '-'}</div>
      </div>
      {enc.chiefComplaint && (
        <div style={{ marginBottom: 8 }}>
          <span className="label">อาการ:</span> {enc.chiefComplaint}
        </div>
      )}
      {p.allergy && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', borderRadius: 6, padding: '6px 12px', marginBottom: 8 }}>
          <strong style={{ color: '#991b1b' }}>⚠️ แพ้ยา: {p.allergy}</strong>
          {p.allergyNote && <span style={{ color: '#b91c1c', marginLeft: 8, fontSize: 12 }}>{p.allergyNote}</span>}
        </div>
      )}

      {/* Vital signs */}
      {v && (
        <>
          <h3>Vital Signs</h3>
          <table style={{ marginBottom: 8 }}>
            <tbody>
              <tr>
                <th>อุณหภูมิ (°C)</th><td>{v.temperature ?? '-'}</td>
                <th>ชีพจร (bpm)</th><td>{v.pulseRate ?? '-'}</td>
                <th>ความดัน (mmHg)</th><td>{v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : '-'}</td>
              </tr>
              <tr>
                <th>SpO2 (%)</th><td>{v.o2Sat != null ? `${v.o2Sat}%` : '-'}</td>
                <th>น้ำหนัก (kg)</th><td>{v.weight ?? '-'}</td>
                <th>ส่วนสูง (cm)</th><td>{v.height ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Diagnoses */}
      {enc.diagnoses.length > 0 && (
        <>
          <h3>การวินิจฉัย</h3>
          <table style={{ marginBottom: 8 }}>
            <thead>
              <tr><th>ประเภท</th><th>รหัส ICD-10</th><th>ชื่อโรค</th></tr>
            </thead>
            <tbody>
              {enc.diagnoses.map((d) => (
                <tr key={d.id}>
                  <td>{DIAG_TYPE[d.type] ?? d.type}</td>
                  <td>{d.icd10Code ?? '-'}</td>
                  <td>{d.icd10Name ?? d.description ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Drug orders */}
      {drugOrders.flatMap(o => o.items).length > 0 && (
        <>
          <h3>ใบสั่งยา</h3>
          <table style={{ marginBottom: 8 }}>
            <thead>
              <tr><th>#</th><th>ชื่อยา</th><th>จำนวน</th><th>วิธีใช้</th><th>จำนวนวัน</th><th>คำแนะนำ</th></tr>
            </thead>
            <tbody>
              {drugOrders.flatMap((o, oi) =>
                o.items.map((item, ii) => (
                  <tr key={`${oi}-${ii}`}>
                    <td>{oi * 100 + ii + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.quantity} {item.unit ?? ''}</td>
                    <td>{item.frequency}</td>
                    <td>{item.durationDays} วัน</td>
                    <td>{item.instruction ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}

      {/* Signature section */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4 }}>แพทย์ผู้ตรวจ</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4 }}>ผู้ป่วย / ผู้ปกครอง</div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 10, color: '#888', textAlign: 'center' }}>
        พิมพ์เมื่อ {new Date().toLocaleString('th-TH')} — TTSS Hospital Information System
      </div>
    </div>
  );
}
