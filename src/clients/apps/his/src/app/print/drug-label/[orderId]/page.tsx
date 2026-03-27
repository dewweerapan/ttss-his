// src/clients/apps/his/src/app/print/drug-label/[orderId]/page.tsx
// Pharmacy drug labels — one label per drug item, auto-print on load
'use client';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type DrugOrderLineItem = {
  id: string; productName: string; quantity: number;
  frequency: string; durationDays: number; instruction?: string; unit?: string;
};
type DrugOrderSummary = {
  id: string; orderNo: string; orderDate: string; items: DrugOrderLineItem[];
};
type EncounterDetail = {
  id: string; encounterNo: string;
  patient: { hn: string; preName?: string; firstName: string; lastName: string; birthdate?: string; allergy?: string };
  admissionDate: string;
};

function age(birthdate?: string): string {
  if (!birthdate) return '-';
  return `${new Date().getFullYear() - new Date(birthdate).getFullYear()} ปี`;
}

export default function PrintDrugLabelPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['print-drug-order', orderId],
    queryFn: () => api.get<DrugOrderSummary>(`/api/drug-orders/${orderId}`),
    enabled: !!orderId,
  });

  // We need encounter info — get encounterId from order, then fetch encounter
  const { data: enc, isLoading: encLoading } = useQuery({
    queryKey: ['print-drug-enc', order?.id],
    queryFn: () => api.get<EncounterDetail>(`/api/encounters/${(order as any).encounterId}`),
    enabled: !!(order as any)?.encounterId,
  });

  const ready = !orderLoading && !encLoading && order && enc;
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (orderLoading || encLoading || !order || !enc) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>กำลังโหลด...</div>;
  }

  const p = enc.patient;
  const fullName = `${p.preName ?? ''}${p.firstName} ${p.lastName}`;
  const dateStr = new Date(order.orderDate).toLocaleDateString('th-TH', { dateStyle: 'medium' });

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
          .label { page-break-inside: avoid; }
        }
        .label {
          border: 1.5px solid #333;
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 12px;
          width: 80mm;
          display: inline-block;
          vertical-align: top;
          margin-right: 8px;
        }
        .label-header { border-bottom: 1px solid #aaa; margin-bottom: 6px; padding-bottom: 4px; }
        .label-footer { border-top: 1px solid #aaa; margin-top: 6px; padding-top: 4px; font-size: 10px; color: #555; }
        .drug-name { font-size: 14px; font-weight: 700; }
        .row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
      `}</style>

      <div className="no-print" style={{ padding: 16 }}>
        <button onClick={() => window.print()} style={{ padding: '6px 16px', cursor: 'pointer' }}>พิมพ์ฉลากยา</button>
        <button onClick={() => window.close()} style={{ marginLeft: 8, padding: '6px 16px', cursor: 'pointer' }}>ปิด</button>
        <span style={{ marginLeft: 16, color: '#666', fontSize: 13 }}>{order.items.length} รายการ</span>
      </div>

      <div style={{ padding: '0 10mm' }}>
        {order.items.map((item, idx) => (
          <div key={item.id} className="label">
            <div className="label-header">
              <div style={{ fontSize: 11, color: '#555' }}>TTSS HOSPITAL — ใบสั่งยา {order.orderNo}</div>
              <div style={{ fontSize: 11 }}>{fullName} | HN: {p.hn} | อายุ {age(p.birthdate)}</div>
              {p.allergy && (
                <div style={{ color: '#b91c1c', fontSize: 10, fontWeight: 700 }}>⚠️ แพ้ยา: {p.allergy}</div>
              )}
            </div>

            <div className="drug-name">{idx + 1}. {item.productName}</div>

            <div className="row">
              <span>จำนวน:</span>
              <strong>{item.quantity} {item.unit ?? 'เม็ด'}</strong>
            </div>
            <div className="row">
              <span>วิธีใช้:</span>
              <strong>{item.frequency}</strong>
            </div>
            <div className="row">
              <span>ระยะเวลา:</span>
              <strong>{item.durationDays} วัน</strong>
            </div>
            {item.instruction && (
              <div style={{ marginTop: 4, fontSize: 11, fontStyle: 'italic', color: '#333' }}>
                คำแนะนำ: {item.instruction}
              </div>
            )}

            <div className="label-footer">
              วันที่จ่ายยา: {dateStr} | {enc.encounterNo}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
