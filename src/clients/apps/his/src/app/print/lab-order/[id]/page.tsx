// src/clients/apps/his/src/app/print/lab-order/[id]/page.tsx
// Print-friendly lab results — no nav, auto-print on load
'use client';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type LabResultDto = { id: string; value: string; referenceRange?: string; isAbnormal: boolean; enteredBy?: string; resultDate: string };
type LabOrderItemDto = { id: string; testCode: string; testName: string; unit?: string; referenceRange?: string; result?: LabResultDto };
type LabOrderDto = {
  id: string; orderNo: string; encounterId: string; encounterNo?: string;
  patientName?: string; hn?: string; orderedBy?: string;
  status: number; requestDate: string; completedDate?: string; notes?: string;
  items: LabOrderItemDto[];
};

export default function PrintLabOrderPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['print-lab-order', id],
    queryFn: () => api.get<LabOrderDto>(`/api/lab-orders/${id}`),
    enabled: !!id,
  });

  const ready = !isLoading && order;
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (isLoading || !order) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>กำลังโหลด...</div>;
  }

  const dateStr = new Date(order.requestDate).toLocaleDateString('th-TH', { dateStyle: 'long' });
  const completedStr = order.completedDate
    ? new Date(order.completedDate).toLocaleString('th-TH')
    : '-';
  const hasAbnormal = order.items.some(i => i.result?.isAbnormal);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#111', padding: '20mm 20mm', maxWidth: 210, margin: '0 auto' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 5px 8px; border: 1px solid #ccc; font-size: 12px; }
        th { background: #f0f0f0; text-align: left; }
        h2 { margin: 0 0 4px; }
        h3 { margin: 12px 0 6px; border-bottom: 1px solid #aaa; padding-bottom: 2px; }
        .abnormal { color: #b91c1c; font-weight: 700; }
      `}</style>

      <div className="no-print" style={{ marginBottom: 16 }}>
        <button onClick={() => window.print()} style={{ padding: '6px 16px', cursor: 'pointer' }}>พิมพ์</button>
        <button onClick={() => window.close()} style={{ marginLeft: 8, padding: '6px 16px', cursor: 'pointer' }}>ปิด</button>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 8, marginBottom: 12 }}>
        <h2>TTSS HOSPITAL</h2>
        <div style={{ fontSize: 14 }}>รายงานผลการตรวจทางห้องปฏิบัติการ</div>
        <div style={{ fontSize: 12, color: '#555' }}>เลขที่ใบส่งตรวจ: <strong>{order.orderNo}</strong></div>
      </div>

      {/* Patient & Order info */}
      <h3>ข้อมูลผู้ป่วย / ใบส่งตรวจ</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
        <div><span style={{ color: '#555' }}>HN:</span> <strong>{order.hn ?? '-'}</strong></div>
        <div><span style={{ color: '#555' }}>ชื่อ-สกุล:</span> {order.patientName ?? '-'}</div>
        <div><span style={{ color: '#555' }}>เลขที่ Visit:</span> {order.encounterNo ?? '-'}</div>
        <div><span style={{ color: '#555' }}>วันที่สั่งตรวจ:</span> {dateStr}</div>
        <div><span style={{ color: '#555' }}>ผู้สั่งตรวจ:</span> {order.orderedBy ?? '-'}</div>
        <div><span style={{ color: '#555' }}>วันที่รายงานผล:</span> {completedStr}</div>
      </div>

      {hasAbnormal && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', borderRadius: 6, padding: '6px 12px', marginBottom: 10 }}>
          <strong style={{ color: '#991b1b' }}>⚠️ พบค่าผิดปกติในผลการตรวจ กรุณาตรวจสอบ</strong>
        </div>
      )}

      {/* Results table */}
      <h3>ผลการตรวจ</h3>
      <table style={{ marginBottom: 12 }}>
        <thead>
          <tr>
            <th>รายการตรวจ</th>
            <th>ผล</th>
            <th>หน่วย</th>
            <th>ค่าอ้างอิง</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map(item => (
            <tr key={item.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{item.testCode}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{item.testName}</div>
              </td>
              <td className={item.result?.isAbnormal ? 'abnormal' : ''}>
                {item.result?.value ?? <span style={{ color: '#888' }}>รอผล</span>}
                {item.result?.isAbnormal && ' ▲'}
              </td>
              <td>{item.unit ?? '-'}</td>
              <td>{item.result?.referenceRange ?? item.referenceRange ?? '-'}</td>
              <td>
                {item.result
                  ? <span style={{ color: item.result.isAbnormal ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                      {item.result.isAbnormal ? 'ผิดปกติ' : 'ปกติ'}
                    </span>
                  : <span style={{ color: '#888' }}>รอผล</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.notes && (
        <div style={{ marginBottom: 12 }}>
          <strong>หมายเหตุ:</strong> {order.notes}
        </div>
      )}

      {/* Signature */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4 }}>นักเทคนิคการแพทย์</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4 }}>แพทย์ผู้สั่งตรวจ</div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 10, color: '#888', textAlign: 'center' }}>
        พิมพ์เมื่อ {new Date().toLocaleString('th-TH')} — TTSS Hospital Information System
      </div>
    </div>
  );
}
