// src/clients/apps/his/src/app/(main)/lab/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Checkbox, Group, Modal, Paper, Stack,
  Table, Tabs, Text, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type LabOrderItem = { id: string; labOrderId: string; testCode: string; testName: string; unit?: string; referenceRange?: string; result?: { id: string; value: string; referenceRange?: string; isAbnormal: boolean; enteredBy?: string; resultDate: string } };
type LabOrder = {
  id: string; orderNo: string; encounterId: string; encounterNo?: string;
  patientName?: string; hn?: string; orderedBy?: string;
  status: number; requestDate: string; completedDate?: string; notes?: string;
  items: LabOrderItem[];
};

const STATUS_LABEL: Record<number, string> = { 1: 'รอรับสิ่งส่งตรวจ', 2: 'รับแล้ว', 3: 'กำลังตรวจ', 4: 'เสร็จสิ้น', 9: 'ยกเลิก' };
const STATUS_COLOR: Record<number, string> = { 1: 'yellow', 2: 'blue', 3: 'orange', 4: 'green', 9: 'red' };

const COMMON_TESTS = [
  { code: 'CBC', name: 'Complete Blood Count', unit: 'cells/μL' },
  { code: 'BUN', name: 'Blood Urea Nitrogen', unit: 'mg/dL', ref: '7-20' },
  { code: 'CR', name: 'Creatinine', unit: 'mg/dL', ref: '0.6-1.2' },
  { code: 'FBS', name: 'Fasting Blood Sugar', unit: 'mg/dL', ref: '70-100' },
  { code: 'LFT', name: 'Liver Function Test', unit: 'U/L' },
  { code: 'UA', name: 'Urinalysis', unit: '-' },
  { code: 'LIPID', name: 'Lipid Profile', unit: 'mg/dL' },
  { code: 'HBA1C', name: 'HbA1c', unit: '%', ref: '<5.7' },
];

export default function LabPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>('worklist');
  const [selected, setSelected] = useState<LabOrder | null>(null);
  const [detailOpen, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [resultOpen, { open: openResult, close: closeResult }] = useDisclosure(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Result entry state: { itemId -> value, isAbnormal }
  const [resultValues, setResultValues] = useState<Record<string, { value: string; isAbnormal: boolean }>>({});

  const statusFilter = activeTab === 'worklist' ? undefined : activeTab === 'pending' ? 1 : activeTab === 'processing' ? 3 : 4;

  const { data: orders = [], refetch } = useQuery({
    queryKey: ['lab-orders', statusFilter],
    queryFn: () => api.get<LabOrder[]>(`/api/lab-orders${statusFilter !== undefined ? `?status=${statusFilter}` : ''}`),
    refetchInterval: 20000,
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/lab-orders/${id}/receive`, {}),
    onSuccess: () => { setSuccessMsg('รับสิ่งส่งตรวจแล้ว'); qc.invalidateQueries({ queryKey: ['lab-orders'] }); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/lab-orders/${id}/cancel`, {}),
    onSuccess: () => { setSuccessMsg('ยกเลิกแล้ว'); closeDetail(); qc.invalidateQueries({ queryKey: ['lab-orders'] }); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const enterResultsMutation = useMutation({
    mutationFn: ({ orderId, results }: { orderId: string; results: { labOrderItemId: string; value: string; isAbnormal: boolean; enteredBy: string | null; referenceRange: string | null; notes: string | null }[] }) =>
      api.post(`/api/lab-orders/${orderId}/results`, { results }),
    onSuccess: () => {
      setSuccessMsg('บันทึกผลแล้ว'); setErrorMsg(''); closeResult();
      qc.invalidateQueries({ queryKey: ['lab-orders'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const handleOpenResult = (order: LabOrder) => {
    setSelected(order);
    const init: Record<string, { value: string; isAbnormal: boolean }> = {};
    order.items.forEach(i => {
      init[i.id] = { value: i.result?.value ?? '', isAbnormal: i.result?.isAbnormal ?? false };
    });
    setResultValues(init);
    setErrorMsg('');
    openResult();
  };

  const handleSubmitResults = () => {
    if (!selected) return;
    const results = Object.entries(resultValues)
      .filter(([, v]) => v.value.trim() !== '')
      .map(([itemId, v]) => ({ labOrderItemId: itemId, value: v.value, isAbnormal: v.isAbnormal, enteredBy: null, referenceRange: null, notes: null }));
    if (results.length === 0) { setErrorMsg('กรุณาระบุผลอย่างน้อย 1 รายการ'); return; }
    enterResultsMutation.mutate({ orderId: selected.id, results });
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ห้องปฏิบัติการ (Laboratory)</Title>
        <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="worklist">Worklist (Active)</Tabs.Tab>
          <Tabs.Tab value="pending">รอรับ</Tabs.Tab>
          <Tabs.Tab value="processing">กำลังตรวจ</Tabs.Tab>
          <Tabs.Tab value="completed">เสร็จสิ้น</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Paper withBorder>
        <Table highlightOnHover striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>เลขที่ใบส่งตรวจ</Table.Th>
              <Table.Th>ผู้ป่วย</Table.Th>
              <Table.Th>รายการตรวจ</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orders.length === 0 ? (
              <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed">ไม่มีรายการ</Text></Table.Td></Table.Tr>
            ) : orders.map(order => (
              <Table.Tr key={order.id}>
                <Table.Td><Text fw={600} size="sm">{order.orderNo}</Text></Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{order.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{order.hn} | {order.encounterNo}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{order.items.map(i => i.testCode).join(', ')}</Text>
                  <Text size="xs" c="dimmed">{order.items.length} รายการ</Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" color={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {order.status === 1 && (
                      <Button size="xs" color="blue" loading={receiveMutation.isPending}
                        onClick={() => receiveMutation.mutate(order.id)}>รับสิ่งส่งตรวจ</Button>
                    )}
                    {(order.status === 2 || order.status === 3) && (
                      <Button size="xs" color="green" onClick={() => handleOpenResult(order)}>บันทึกผล</Button>
                    )}
                    {order.status === 4 && (
                      <>
                        <Button size="xs" variant="light" onClick={() => { setSelected(order); openDetail(); }}>ดูผล</Button>
                        <Button size="xs" variant="subtle" component="a" href={`/print/lab-order/${order.id}`} target="_blank">พิมพ์</Button>
                      </>
                    )}
                    {(order.status === 1 || order.status === 2) && (
                      <Button size="xs" color="red" variant="subtle" loading={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(order.id)}>ยกเลิก</Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Result Entry Modal */}
      <Modal opened={resultOpen} onClose={closeResult} title={`บันทึกผล — ${selected?.orderNo}`} size="lg">
        {selected && (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">{selected.patientName} | {selected.encounterNo}</Text>
            <Paper withBorder>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>รายการ</Table.Th>
                    <Table.Th>ค่าอ้างอิง</Table.Th>
                    <Table.Th>ผล</Table.Th>
                    <Table.Th>ผิดปกติ</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selected.items.map(item => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{item.testCode}</Text>
                        <Text size="xs" c="dimmed">{item.testName} {item.unit ? `(${item.unit})` : ''}</Text>
                      </Table.Td>
                      <Table.Td><Text size="xs">{item.referenceRange ?? '-'}</Text></Table.Td>
                      <Table.Td>
                        <TextInput size="xs" style={{ width: 100 }}
                          value={resultValues[item.id]?.value ?? ''}
                          onChange={e => setResultValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], value: e.target.value } }))} />
                      </Table.Td>
                      <Table.Td>
                        <Checkbox
                          checked={resultValues[item.id]?.isAbnormal ?? false}
                          onChange={e => setResultValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], isAbnormal: e.currentTarget.checked } }))} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
            {errorMsg && <Alert color="red">{errorMsg}</Alert>}
            <Group justify="flex-end">
              <Button variant="default" onClick={closeResult}>ยกเลิก</Button>
              <Button color="green" loading={enterResultsMutation.isPending} onClick={handleSubmitResults}>บันทึกผล</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Detail/Results View Modal */}
      <Modal opened={detailOpen} onClose={closeDetail} title={`ผลการตรวจ — ${selected?.orderNo}`} size="lg">
        {selected && (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">{selected.patientName} | {selected.encounterNo}</Text>
            <Paper withBorder>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>รายการ</Table.Th>
                    <Table.Th>ผล</Table.Th>
                    <Table.Th>ค่าอ้างอิง</Table.Th>
                    <Table.Th>สถานะ</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selected.items.map(item => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{item.testCode}</Text>
                        <Text size="xs" c="dimmed">{item.testName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c={item.result?.isAbnormal ? 'red' : undefined} fw={item.result?.isAbnormal ? 700 : undefined}>
                          {item.result?.value ?? 'รอผล'}
                        </Text>
                      </Table.Td>
                      <Table.Td><Text size="xs">{item.result?.referenceRange ?? item.referenceRange ?? '-'}</Text></Table.Td>
                      <Table.Td>
                        {item.result ? (
                          <Badge size="xs" color={item.result.isAbnormal ? 'red' : 'green'}>
                            {item.result.isAbnormal ? 'ผิดปกติ' : 'ปกติ'}
                          </Badge>
                        ) : <Text size="xs" c="dimmed">-</Text>}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDetail}>ปิด</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
