// print/receipt/[encounterId]/page.tsx — A5 receipt print
'use client';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type InvoiceItem = { id: string; description: string; quantity: number; unitPrice: number; totalPrice: number };
type Receipt = { id: string; receiptNo: string; paymentMethod: number; amount: number; paidAt: string };
type Invoice = {
  id: string; invoiceNo: string; encounterId: string; status: number;
  totalAmount: number; issuedAt: string; paidAt?: string;
  items: InvoiceItem[]; receipt?: Receipt;
};
type EncounterDetail = {
  id: string; encounterNo: string; admissionDate: string;
  patient: { hn: string; preName?: string; firstName: string; lastName: string; birthdate?: string };
};

const PAYMENT_METHOD: Record<number, string> = { 1: 'เงินสด', 2: 'บัตร', 3: 'โอน', 4: 'สิทธิ์' };

function age(birthdate?: string): string {
  if (!birthdate) return '-';
  const y = new Date().getFullYear() - new Date(birthdate).getFullYear();
  return `${y} ปี`;
}

export default function PrintReceiptPage() {
  const { encounterId } = useParams<{ encounterId: string }>();

  const { data: invoice, isLoading: invLoading } = useQuery({
    queryKey: ['print-receipt-invoice', encounterId],
    queryFn: () => api.get<Invoice>(`/api/encounters/${encounterId}/invoice`),
    enabled: !!encounterId,
  });

  const { data: enc, isLoading: encLoading } = useQuery({
    queryKey: ['print-receipt-enc', encounterId],
    queryFn: () => api.get<EncounterDetail>(`/api/encounters/${encounterId}`),
    enabled: !!encounterId,
  });

  const ready = !invLoading && !encLoading && invoice && enc;
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (invLoading || encLoading || !invoice || !enc) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>กำลังโหลด...</div>;
  }

  const p = enc.patient;
  const fullName = `${p.preName ?? ''}${p.firstName} ${p.lastName}`;
  const issuedDate = new Date(invoice.issuedAt).toLocaleDateString('th-TH', { dateStyle: 'long' });
  const paidDate = invoice.receipt ? new Date(invoice.receipt.paidAt).toLocaleString('th-TH') : '-';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#111', padding: '10mm 12mm', maxWidth: '148mm', margin: '0 auto' }}>
      <style>{`
        @media print {
          @page { size: A5; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 3px 6px; border: 1px solid #ccc; font-size: 11px; }
        th { background: #f0f0f0; text-align: left; }
        h3 { margin: 8px 0 4px; border-bottom: 1px solid #aaa; padding-bottom: 2px; font-size: 13px; }
      `}</style>

      <div className="no-print" style={{ marginBottom: 12 }}>
        <button onClick={() => window.print()} style={{ padding: '4px 12px', cursor: 'pointer', marginRight: 8 }}>พิมพ์</button>
        <button onClick={() => window.close()} style={{ padding: '4px 12px', cursor: 'pointer' }}>ปิด</button>
      </div>

      {/* Hospital header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 'bold' }}>TTSS HOSPITAL</div>
        <div style={{ fontSize: 13 }}>ใบเสร็จรับเงิน</div>
        <div style={{ fontSize: 11, color: '#555' }}>เลขที่: {invoice.receipt?.receiptNo ?? '-'} | ใบแจ้งหนี้: {invoice.invoiceNo}</div>
        <div style={{ fontSize: 11, color: '#555' }}>วันที่ออก: {issuedDate}</div>
      </div>

      {/* Patient info */}
      <h3>ข้อมูลผู้ป่วย</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 8, fontSize: 11 }}>
        <div><strong>HN:</strong> {p.hn}</div>
        <div><strong>VN:</strong> {enc.encounterNo}</div>
        <div style={{ gridColumn: '1 / -1' }}><strong>ชื่อ-สกุล:</strong> {fullName}</div>
        <div><strong>อายุ:</strong> {age(p.birthdate)}</div>
      </div>

      {/* Invoice items */}
      <h3>รายการ</h3>
      <table style={{ marginBottom: 8 }}>
        <thead>
          <tr><th>รายการ</th><th>จำนวน</th><th style={{ textAlign: 'right' }}>ราคา/หน่วย</th><th style={{ textAlign: 'right' }}>รวม</th></tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td>{item.description}</td>
              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right' }}>{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
              <td style={{ textAlign: 'right' }}>{item.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 'bold', marginBottom: 8, borderTop: '1px solid #333', paddingTop: 4 }}>
        ยอดรวม: {invoice.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
      </div>

      {/* Payment info */}
      {invoice.receipt && (
        <div style={{ background: '#f0fdf0', border: '1px solid #86efac', borderRadius: 4, padding: '6px 10px', marginBottom: 8, fontSize: 11 }}>
          <div><strong>วิธีชำระ:</strong> {PAYMENT_METHOD[invoice.receipt.paymentMethod] ?? '-'}</div>
          <div><strong>จำนวนเงินที่รับ:</strong> {invoice.receipt.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</div>
          <div><strong>วันที่ชำระ:</strong> {paidDate}</div>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 9, color: '#888', textAlign: 'center' }}>
        พิมพ์เมื่อ {new Date().toLocaleString('th-TH')} — TTSS Hospital Information System
      </div>
    </div>
  );
}
