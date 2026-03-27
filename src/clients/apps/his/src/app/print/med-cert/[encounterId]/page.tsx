// print/med-cert/[encounterId]/page.tsx — A5 Medical Certificate
'use client';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type EncounterDetail = {
  id: string; encounterNo: string; admissionDate: string;
  patient: { hn: string; preName?: string; firstName: string; lastName: string; birthdate?: string };
};

function age(birthdate?: string): string {
  if (!birthdate) return '-';
  const y = new Date().getFullYear() - new Date(birthdate).getFullYear();
  return `${y} ปี`;
}

export default function PrintMedCertPage() {
  const { encounterId } = useParams<{ encounterId: string }>();
  const searchParams = useSearchParams();

  const diagnosis = searchParams.get('diagnosis') ?? '';
  const restDays = searchParams.get('restDays') ?? '0';
  const doctorName = searchParams.get('doctorName') ?? '';
  const notes = searchParams.get('notes') ?? '';

  const { data: enc, isLoading } = useQuery({
    queryKey: ['print-med-cert-enc', encounterId],
    queryFn: () => api.get<EncounterDetail>(`/api/encounters/${encounterId}`),
    enabled: !!encounterId,
  });

  const ready = !isLoading && enc;
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (isLoading || !enc) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>กำลังโหลด...</div>;
  }

  const p = enc.patient;
  const fullName = `${p.preName ?? ''}${p.firstName} ${p.lastName}`;
  const examDate = new Date(enc.admissionDate).toLocaleDateString('th-TH', { dateStyle: 'long' });
  const issueDate = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });

  return (
    <div style={{ fontFamily: 'Sarabun, Arial, sans-serif', fontSize: 13, color: '#111', padding: '12mm 14mm', maxWidth: '148mm', margin: '0 auto' }}>
      <style>{`
        @media print {
          @page { size: A5; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
        .label { color: #555; }
      `}</style>

      <div className="no-print" style={{ marginBottom: 12 }}>
        <button onClick={() => window.print()} style={{ padding: '4px 12px', cursor: 'pointer', marginRight: 8 }}>พิมพ์</button>
        <button onClick={() => window.close()} style={{ padding: '4px 12px', cursor: 'pointer' }}>ปิด</button>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 'bold' }}>TTSS HOSPITAL</div>
        <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 4 }}>ใบรับรองแพทย์</div>
        <div style={{ fontSize: 11, color: '#555' }}>Medical Certificate</div>
      </div>

      {/* Date & No */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12 }}>
        <div><span className="label">เลขที่ VN:</span> {enc.encounterNo}</div>
        <div><span className="label">วันที่:</span> {issueDate}</div>
      </div>

      {/* Patient info */}
      <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
        <div style={{ marginBottom: 4 }}><span className="label">ชื่อ-สกุล:</span> <strong>{fullName}</strong></div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div><span className="label">HN:</span> {p.hn}</div>
          <div><span className="label">อายุ:</span> {age(p.birthdate)}</div>
        </div>
      </div>

      {/* Certificate body */}
      <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 12 }}>
        <p style={{ margin: '0 0 8px' }}>
          ข้าพเจ้า <strong>{doctorName || '....................................'}</strong> แพทย์ผู้ตรวจ ขอรับรองว่า
          ได้ตรวจร่างกายผู้ป่วยรายนี้เมื่อวันที่ <strong>{examDate}</strong>
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>ตรวจพบว่า:</strong> {diagnosis || '...................................................................................................'}
        </p>
        <p style={{ margin: '0 0 8px' }}>
          ผู้ป่วยควรพักงาน/การเรียน เป็นเวลา <strong>{restDays} วัน</strong>
          (ตั้งแต่วันที่ {issueDate})
        </p>
        {notes && (
          <p style={{ margin: '0 0 8px' }}>
            <strong>หมายเหตุ:</strong> {notes}
          </p>
        )}
      </div>

      {/* Hospital stamp area */}
      <div style={{ border: '1px dashed #aaa', borderRadius: 4, padding: '8px 12px', marginBottom: 16, minHeight: 60, textAlign: 'center', fontSize: 11, color: '#aaa' }}>
        ประทับตราโรงพยาบาล
      </div>

      {/* Signature */}
      <div style={{ textAlign: 'right', marginTop: 8 }}>
        <div style={{ display: 'inline-block', textAlign: 'center', minWidth: 160 }}>
          <div style={{ height: 48 }} />
          <div style={{ borderTop: '1px solid #333', paddingTop: 4, fontSize: 12 }}>
            {doctorName ? `นพ./พญ. ${doctorName}` : 'แพทย์ผู้ตรวจ'}
          </div>
          <div style={{ fontSize: 11, color: '#555' }}>วันที่ {issueDate}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 9, color: '#aaa', textAlign: 'center' }}>
        พิมพ์เมื่อ {new Date().toLocaleString('th-TH')} — TTSS Hospital Information System
      </div>
    </div>
  );
}
