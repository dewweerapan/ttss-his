// src/clients/apps/his/src/app/(main)/billing/page.tsx
'use client';
import { useState } from 'react';
import {
  Badge, Button, Divider, Group, Modal, NumberInput, Paper,
  Stack, Table, Text, Title, Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
type BillingEncounterItem = {
  encounterId: string; encounterNo: string; hn: string; patientName: string;
  admissionDate: string; invoiceStatus?: number; invoiceNo?: string; totalAmount?: number;
};
type InvoiceItem = {
  id: string; description: string; quantity: number; unitPrice: number; totalPrice: number; productName?: string;
};
type Receipt = { id: string; receiptNo: string; paymentMethod: number; amount: number; paidAt: string; };
type Invoice = {
  id: string; invoiceNo: string; encounterId: string; status: number;
  totalAmount: number; issuedAt: string; paidAt?: string;
  items: InvoiceItem[];
  receipt?: Receipt;
};

const INVOICE_STATUS_LABEL: Record<number, string> = { 1: 'รอชำระ', 2: 'ชำระแล้ว', 9: 'ยกเลิก' };
const INVOICE_STATUS_COLOR: Record<number, string> = { 1: 'yellow', 2: 'green', 9: 'red' };
const PAYMENT_METHOD_LABEL: Record<number, string> = { 1: 'เงินสด', 2: 'บัตรเดบิต/เครดิต', 3: 'โอนเงิน', 4: 'สิทธิ์' };

// ── Page ───────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const qc = useQueryClient();
  const [selectedEncounter, setSelectedEncounter] = useState<BillingEncounterItem | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<number | string>(1);
  const [paidAmount, setPaidAmount] = useState<number | string>('');
  const [payModalOpen, { open: openPayModal, close: closePayModal }] = useDisclosure(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['billing', 'worklist'],
    queryFn: () => api.get<BillingEncounterItem[]>('/api/billing'),
    refetchInterval: 20000,
  });

  const fetchInvoice = async (encounterId: string) => {
    setErrorMsg('');
    try {
      const inv = await api.get<Invoice>(`/api/encounters/${encounterId}/invoice`);
      setInvoice(inv);
    } catch {
      setInvoice(null);
    }
  };

  const handleSelectEncounter = async (enc: BillingEncounterItem) => {
    setSelectedEncounter(enc);
    setSuccessMsg('');
    setErrorMsg('');
    await fetchInvoice(enc.encounterId);
  };

  const createInvoiceMutation = useMutation({
    mutationFn: (encounterId: string) =>
      api.post<Invoice>(`/api/encounters/${encounterId}/invoice`),
    onSuccess: (data) => {
      setInvoice(data);
      setSuccessMsg('สร้างใบแจ้งหนี้สำเร็จ');
      setErrorMsg('');
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const payMutation = useMutation({
    mutationFn: ({ invoiceId, method, amount }: { invoiceId: string; method: number; amount: number }) =>
      api.post(`/api/invoices/${invoiceId}/pay`, { paymentMethod: method, amount }),
    onSuccess: async () => {
      setSuccessMsg('ชำระเงินสำเร็จ');
      setErrorMsg('');
      closePayModal();
      if (invoice?.id) {
        const inv = await api.get<Invoice>(`/api/encounters/${selectedEncounter?.encounterId}/invoice`);
        setInvoice(inv);
      }
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => api.delete(`/api/invoices/${invoiceId}`),
    onSuccess: () => {
      setSuccessMsg('ยกเลิกใบแจ้งหนี้สำเร็จ');
      setErrorMsg('');
      setInvoice(null);
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const handlePay = () => {
    if (!invoice) return;
    payMutation.mutate({ invoiceId: invoice.id, method: Number(paymentMethod), amount: Number(paidAmount) });
  };

  const openPay = () => {
    if (!invoice) return;
    setPaidAmount(invoice.totalAmount);
    setPaymentMethod(1);
    openPayModal();
  };

  const encounters = listData ?? [];

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>งานการเงิน (Billing)</Title>
        <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
      </Group>

      {successMsg && <Alert color="green">{successMsg}</Alert>}
      {errorMsg && <Alert color="red">{errorMsg}</Alert>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left: encounter list */}
        <div style={{ width: 380, flexShrink: 0 }}>
          <Paper withBorder>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>HN / ชื่อ</Table.Th>
                  <Table.Th>VN</Table.Th>
                  <Table.Th>ใบแจ้งหนี้</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading ? (
                  <Table.Tr><Table.Td colSpan={3}><Text ta="center">กำลังโหลด...</Text></Table.Td></Table.Tr>
                ) : encounters.length === 0 ? (
                  <Table.Tr><Table.Td colSpan={3}><Text ta="center" c="dimmed">ไม่มีรายการ</Text></Table.Td></Table.Tr>
                ) : encounters.map((enc) => (
                  <Table.Tr
                    key={enc.encounterId}
                    onClick={() => handleSelectEncounter(enc)}
                    style={{ cursor: 'pointer', background: selectedEncounter?.encounterId === enc.encounterId ? '#e8f4fd' : undefined }}
                  >
                    <Table.Td>
                      <Text size="sm" fw={500}>{enc.patientName}</Text>
                      <Text size="xs" c="dimmed">{enc.hn}</Text>
                    </Table.Td>
                    <Table.Td><Text size="sm">{enc.encounterNo}</Text></Table.Td>
                    <Table.Td>
                      {enc.invoiceNo ? (
                        <Badge size="sm" color={INVOICE_STATUS_COLOR[enc.invoiceStatus ?? 1]}>{enc.invoiceNo}</Badge>
                      ) : (
                        <Text size="xs" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </div>

        {/* Right: invoice detail */}
        <div style={{ flex: 1 }}>
          {!selectedEncounter ? (
            <Paper withBorder p="xl">
              <Text ta="center" c="dimmed">เลือกผู้ป่วยจากรายชื่อด้านซ้าย</Text>
            </Paper>
          ) : (
            <Stack gap="sm">
              <Paper withBorder p="sm">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text fw={600}>{selectedEncounter.patientName}</Text>
                    <Text size="sm" c="dimmed">HN: {selectedEncounter.hn} | VN: {selectedEncounter.encounterNo}</Text>
                  </Stack>
                  {!invoice && (
                    <Button size="sm" color="blue"
                      loading={createInvoiceMutation.isPending}
                      onClick={() => createInvoiceMutation.mutate(selectedEncounter.encounterId)}>
                      สร้างใบแจ้งหนี้
                    </Button>
                  )}
                </Group>
              </Paper>

              {invoice && (
                <Paper withBorder p="md">
                  <Group justify="space-between" mb="sm">
                    <Stack gap={2}>
                      <Text fw={700}>ใบแจ้งหนี้ {invoice.invoiceNo}</Text>
                      <Badge color={INVOICE_STATUS_COLOR[invoice.status]}>
                        {INVOICE_STATUS_LABEL[invoice.status]}
                      </Badge>
                    </Stack>
                    <Group gap="xs">
                      {invoice.status === 1 && (
                        <Button size="sm" color="green" onClick={openPay}>ชำระเงิน</Button>
                      )}
                      {invoice.status === 1 && (
                        <Button size="sm" variant="outline" color="red"
                          loading={cancelInvoiceMutation.isPending}
                          onClick={() => cancelInvoiceMutation.mutate(invoice.id)}>
                          ยกเลิก
                        </Button>
                      )}
                    </Group>
                  </Group>

                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>รายการ</Table.Th>
                        <Table.Th ta="right">จำนวน</Table.Th>
                        <Table.Th ta="right">ราคา/หน่วย</Table.Th>
                        <Table.Th ta="right">รวม</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {invoice.items.map((item) => (
                        <Table.Tr key={item.id}>
                          <Table.Td><Text size="sm">{item.description}</Text></Table.Td>
                          <Table.Td ta="right"><Text size="sm">{item.quantity}</Text></Table.Td>
                          <Table.Td ta="right"><Text size="sm">{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text></Table.Td>
                          <Table.Td ta="right"><Text size="sm">{item.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text></Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  <Divider my="sm" />
                  <Group justify="flex-end">
                    <Text size="lg" fw={700}>
                      ยอดรวม: {invoice.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    </Text>
                  </Group>

                  {invoice.receipt && (
                    <>
                      <Divider label="ใบเสร็จ" my="sm" />
                      <Group justify="space-between">
                        <Text size="sm">{invoice.receipt.receiptNo} — {PAYMENT_METHOD_LABEL[invoice.receipt.paymentMethod] ?? '-'}</Text>
                        <Text size="sm" fw={600} c="green">
                          {invoice.receipt.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                        </Text>
                      </Group>
                    </>
                  )}
                </Paper>
              )}
            </Stack>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <Modal opened={payModalOpen} onClose={closePayModal} title="ชำระเงิน">
        {invoice && (
          <Stack gap="md">
            <Text>ยอดที่ต้องชำระ: <strong>{invoice.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong></Text>

            <div>
              <Text size="sm" fw={500} mb={4}>วิธีชำระเงิน</Text>
              <Group>
                {[1, 2, 3, 4].map((m) => (
                  <Button key={m} size="xs" variant={paymentMethod === m ? 'filled' : 'outline'} onClick={() => setPaymentMethod(m)}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </Button>
                ))}
              </Group>
            </div>

            <NumberInput label="จำนวนเงินที่รับ (บาท)" value={paidAmount} onChange={setPaidAmount} min={0} decimalScale={2} />

            {Number(paidAmount) > invoice.totalAmount && (
              <Alert color="blue">
                เงินทอน: {(Number(paidAmount) - invoice.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </Alert>
            )}

            {errorMsg && <Alert color="red">{errorMsg}</Alert>}

            <Group justify="flex-end">
              <Button variant="default" onClick={closePayModal}>ยกเลิก</Button>
              <Button color="green" loading={payMutation.isPending}
                disabled={Number(paidAmount) < invoice.totalAmount}
                onClick={handlePay}>
                ยืนยันชำระเงิน
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
