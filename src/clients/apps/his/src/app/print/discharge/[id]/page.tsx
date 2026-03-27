// print/discharge/[id]/page.tsx — A4 Discharge Summary
'use client';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type DiagnosisInfo = { id: string; type: number; icd10Code?: string; icd10Name?: string; description?: string; isConfirmed: boolean };
type DrugOrderLineItem = { id: string; productName: string; quantity: number; frequency: string; durationDays: number; instruction?: string; unit?: string };
type DrugOrderSummary = { id: string; orderNo: string; status: number; orderDate: string; items: DrugOrderLineItem[] };
type EncounterDetail = {
  id: string; encounterNo: string; status: number; type: number;
  chiefComplaint?: string; admissionDate: string; dischargeDate?: string; doctorId?: string;
  patient: { id: string; hn: string; preName?: string; firstName: string; lastName: string; birthdate?: string; phoneNumber?: string };
  diagnoses: DiagnosisInfo[];
};
type IpdEncounterDetail = {
  encounterId: string; encounterNo: string; hn: string; patientName: string;
  bedNumber?: string; wardId?: string; admissionDate: string; dischargeDate?: string;
  doctorName?: string;
};

const DIAG_TYPE: Record<number, string> = { 1: 'Principal Dx', 2: 'Comorbidity', 3: 'Complication', 4: 'Rule Out' };

function age(birthdate?: string): string {
  if (!birthdate) return '-';
  const y = new Date().getFullYear() - new Date(birthdate).getFullYear();
  return `${y} ปี`;
}

export default function PrintDischargePage() {
  const { id } = useParams<{ id: string }>();

  const { data: enc, isLoading: encLoading } = useQuery({
    queryKey: ['print-discharge-enc', id],
    queryFn: () => api.get<EncounterDetail>(`/api/encounters/${id}`),
    enabled: !!id,
  });

  const { data: drugOrders = [] } = useQuery({
    queryKey: ['print-discharge-drugs', id],
    queryFn: () => api.get<DrugOrderSummary[]>(`/api/encounters/${id}/drug-orders`),
    enabled: !!id,
  });

  const { data: admission } = useQuery({
    queryKey: ['print-discharge-admission', id],
    queryFn: async () => {
      try {
        return await api.get<IpdEncounterDetail>(`/api/admissions/${id}`);
      } catch {
        return null;
      }
    },
    enabled: !!id,
    retry: false,
  });

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
  const admDate = new Date(enc.admissionDate).toLocaleDateString('th-TH', { dateStyle: 'long' });
  const disDate = enc.dischargeDate ? new Date(enc.dischargeDate).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '-';
  const allDrugItems = drugOrders.flatMap(o => o.items);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#111', padding: '20mm 20mm', maxWidth: '210mm', margin: '0 auto' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 8px; border: 1px solid #ccc; font-size: 12px; }
        th { background: #f0f0f0; text-align: left; }
        h3 { margin: 12px 0 6px; border-bottom: 1px solid #aaa; padding-bottom: 2px; font-size: 14px; }
      `}</style>

      <div className="no-print" style={{ marginBottom: 16 }}>
        <button onClick={() => window.print()} style={{ padding: '6px 16px', cursor: 'pointer', marginRight: 8 }}>พิมพ์</button>
        <button onClick={() => window.close()} style={{ padding: '6px 16px', cursor: 'pointer' }}>ปิด</button>
      </div>

      {/* Hospital header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 'bold' }}>TTSS HOSPITAL</div>
        <div style={{ fontSize: 15 }}>สรุปการรักษา / Discharge Summary</div>
        <div style={{ fontSize: 12, color: '#555' }}>{enc.encounterNo}</div>
      </div>

      {/* Patient info */}
      <h3>ข้อมูลผู้ป่วย</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8, fontSize: 12 }}>
        <div><strong>HN:</strong> {p.hn}</div>
        <div><strong>VN/AN:</strong> {enc.encounterNo}</div>
        <div><strong>ชื่อ-สกุล:</strong> {fullName}</div>
        <div><strong>อายุ:</strong> {age(p.birthdate)}</div>
        <div><strong>วันที่รับ:</strong> {admDate}</div>
        <div><strong>วันที่จำหน่าย:</strong> {disDate}</div>
        {admission && (
          <>
            <div><strong>เตียง:</strong> {admission.bedNumber ?? '-'}</div>
            <div><strong>Ward:</strong> {admission.wardId ?? '-'}</div>
            {admission.doctorName && <div style={{ gridColumn: '1/-1' }}><strong>แพทย์ผู้รักษา:</strong> {admission.doctorName}</div>}
          </>
        )}
      </div>

      {/* Chief complaint */}
      {enc.chiefComplaint && (
        <>
          <h3>อาการสำคัญ</h3>
          <div style={{ marginBottom: 8, fontSize: 12 }}>{enc.chiefComplaint}</div>
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
      {allDrugItems.length > 0 && (
        <>
          <h3>ยาที่ได้รับ</h3>
          <table style={{ marginBottom: 8 }}>
            <thead>
              <tr><th>#</th><th>ชื่อยา</th><th>จำนวน</th><th>วิธีใช้</th><th>จำนวนวัน</th><th>คำแนะนำ</th></tr>
            </thead>
            <tbody>
              {allDrugItems.map((item, i) => (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td>{item.productName}</td>
                  <td>{item.quantity} {item.unit ?? ''}</td>
                  <td>{item.frequency}</td>
                  <td>{item.durationDays} วัน</td>
                  <td>{item.instruction ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Discharge instructions */}
      <h3>คำแนะนำการปฏิบัติตัว</h3>
      <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: '8px 12px', marginBottom: 16, fontSize: 12, minHeight: 60 }}>
        ปฏิบัติตามแพทย์สั่ง
      </div>

      {/* Signature blocks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #333', marginTop: 48, paddingTop: 4, fontSize: 12 }}>แพทย์ผู้รักษา</div>
          <div style={{ fontSize: 11, color: '#555' }}>วันที่ ............................................</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #333', marginTop: 48, paddingTop: 4, fontSize: 12 }}>ผู้ป่วย / ผู้ปกครอง</div>
          <div style={{ fontSize: 11, color: '#555' }}>วันที่ ............................................</div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 10, color: '#888', textAlign: 'center' }}>
        พิมพ์เมื่อ {new Date().toLocaleString('th-TH')} — TTSS Hospital Information System
      </div>
    </div>
  );
}
