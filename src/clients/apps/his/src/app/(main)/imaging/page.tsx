// src/clients/apps/his/src/app/(main)/imaging/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select, Stack,
  Table, Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Encounter = { encounterId: string; encounterNo: string; hn: string; patientName: string };
type ImagingOrder = {
  id: string; encounterId: string; patientName?: string; hn?: string;
  modalityType: number; studyName: string; clinicalInfo?: string; orderedBy?: string;
  status: number; orderDate: string; completedAt?: string;
  radiologyReport?: string; radiologistName?: string; impression?: string;
};

const MODALITY_LABEL: Record<number, string> = {
  1: 'X-Ray', 2: 'CT', 3: 'MRI', 4: 'Ultrasound', 5: 'Nuclear Medicine', 9: 'Other',
};
const STATUS_LABEL: Record<number, string> = { 1: 'รอ', 2: 'นัดหมาย', 3: 'กำลังทำ', 4: 'รายงานแล้ว', 9: 'ยกเลิก' };
const STATUS_COLOR: Record<number, string>  = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'green', 9: 'red' };

export default function ImagingPage() {
  const qc = useQueryClient();
  const [orderOpen, { open: openOrder, close: closeOrder }] = useDisclosure(false);
  const [reportOpen, { open: openReport, close: closeReport }] = useDisclosure(false);
  const [viewOpen, { open: openView, close: closeView }] = useDisclosure(false);
  const [selectedOrder, setSelectedOrder] = useState<ImagingOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [encSearch, setEncSearch] = useState('');
  const [selectedEnc, setSelectedEnc] = useState<string | null>(null);
  const [modality, setModality] = useState<string | null>('1');
  const [studyName, setStudyName] = useState('');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [orderedBy, setOrderedBy] = useState('');
  const [report, setReport] = useState('');
  const [impression, setImpression] = useState('');
  const [radiologist, setRadiologist] = useState('');

  const { data: orders = [], refetch } = useQuery({
    queryKey: ['imaging-orders'],
    queryFn: () => api.get<ImagingOrder[]>('/api/imaging-orders'),
    refetchInterval: 60000,
  });

  const { data: encounters = [] } = useQuery({
    queryKey: ['all-encounters-active'],
    queryFn: () => api.get<Encounter[]>('/api/admissions'),
    enabled: orderOpen,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/imaging-orders', {
      encounterId: selectedEnc, modalityType: Number(modality),
      studyName, clinicalInfo: clinicalInfo || null, orderedBy: orderedBy || null,
    }),
    onSuccess: () => {
      setSuccessMsg('ส่งคำสั่งถ่ายภาพสำเร็จ'); setErrorMsg('');
      closeOrder(); qc.invalidateQueries({ queryKey: ['imaging-orders'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/api/imaging-orders/${selectedOrder!.id}/complete`, {
      report, radiologistName: radiologist || null, impression: impression || null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกรายงานรังสีสำเร็จ'); setErrorMsg('');
      closeReport(); refetch();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/imaging-orders/${id}/cancel`, {}),
    onSuccess: () => { setSuccessMsg('ยกเลิกคำสั่งแล้ว'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>รังสีวิทยา (Imaging)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={() => {
            setSelectedEnc(null); setModality('1'); setStudyName(''); setClinicalInfo('');
            setOrderedBy(''); setErrorMsg(''); openOrder();
          }}>+ ส่งตรวจ</Button>
        </Group>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ผู้ป่วย</Table.Th>
              <Table.Th>Modality</Table.Th>
              <Table.Th>ชื่อการตรวจ</Table.Th>
              <Table.Th>แพทย์ผู้ส่ง</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orders.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีคำสั่งถ่ายภาพ</Text></Table.Td></Table.Tr>
            ) : orders.map(o => (
              <Table.Tr key={o.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{o.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{o.hn ?? '-'}</Text>
                </Table.Td>
                <Table.Td><Badge size="sm" variant="light">{MODALITY_LABEL[o.modalityType] ?? '-'}</Badge></Table.Td>
                <Table.Td><Text size="sm">{o.studyName}</Text></Table.Td>
                <Table.Td><Text size="sm">{o.orderedBy ?? '-'}</Text></Table.Td>
                <Table.Td><Badge size="sm" color={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {o.status === 4 && (
                      <Button size="xs" variant="light" onClick={() => { setSelectedOrder(o); openView(); }}>ดูรายงาน</Button>
                    )}
                    {(o.status === 1 || o.status === 2 || o.status === 3) && (
                      <Button size="xs" color="green" variant="outline"
                        onClick={() => { setSelectedOrder(o); setReport(''); setImpression(''); setRadiologist(''); openReport(); }}>
                        บันทึกรายงาน
                      </Button>
                    )}
                    {o.status < 4 && (
                      <Button size="xs" color="red" variant="subtle"
                        loading={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(o.id)}>ยกเลิก</Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Order Modal */}
      <Modal opened={orderOpen} onClose={closeOrder} title="ส่งตรวจรังสี">
        <Stack gap="sm">
          <Select label="ผู้ป่วย" placeholder="เลือกผู้ป่วย..." searchable
            data={encounters.map(e => ({ value: e.encounterId, label: `${e.patientName} (${e.hn})` }))}
            value={selectedEnc} onChange={setSelectedEnc}
          />
          <Select label="Modality" data={[
            { value: '1', label: 'X-Ray' }, { value: '2', label: 'CT' },
            { value: '3', label: 'MRI' }, { value: '4', label: 'Ultrasound' },
            { value: '5', label: 'Nuclear Medicine' }, { value: '9', label: 'Other' },
          ]} value={modality} onChange={setModality} />
          <TextInput label="ชื่อการตรวจ" value={studyName} onChange={e => setStudyName(e.target.value)} required />
          <Textarea label="ข้อมูลทางคลินิก" rows={2} value={clinicalInfo} onChange={e => setClinicalInfo(e.target.value)} />
          <TextInput label="แพทย์ผู้ส่ง" value={orderedBy} onChange={e => setOrderedBy(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeOrder}>ยกเลิก</Button>
            <Button color="blue" loading={createMutation.isPending}
              disabled={!selectedEnc || !studyName}
              onClick={() => createMutation.mutate()}>ส่งตรวจ</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Report Modal */}
      <Modal opened={reportOpen} onClose={closeReport} title="บันทึกรายงานรังสี">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">การตรวจ: <strong>{selectedOrder?.studyName}</strong></Text>
          <Textarea label="รายงาน" rows={5} value={report} onChange={e => setReport(e.target.value)} />
          <TextInput label="Impression / สรุป" value={impression} onChange={e => setImpression(e.target.value)} />
          <TextInput label="รังสีแพทย์" value={radiologist} onChange={e => setRadiologist(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeReport}>ยกเลิก</Button>
            <Button color="green" loading={completeMutation.isPending}
              disabled={!report} onClick={() => completeMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>

      {/* View Report Modal */}
      <Modal opened={viewOpen} onClose={closeView} title="รายงานรังสี" size="lg">
        {selectedOrder && (
          <Stack gap="sm">
            <Group>
              <Badge>{MODALITY_LABEL[selectedOrder.modalityType]}</Badge>
              <Text fw={600}>{selectedOrder.studyName}</Text>
            </Group>
            <Text size="sm" c="dimmed">ผู้ป่วย: {selectedOrder.patientName} | {selectedOrder.hn}</Text>
            <Text size="sm"><strong>รายงาน:</strong></Text>
            <Paper withBorder p="sm"><Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selectedOrder.radiologyReport ?? '-'}</Text></Paper>
            {selectedOrder.impression && (
              <><Text size="sm"><strong>Impression:</strong></Text>
              <Text size="sm">{selectedOrder.impression}</Text></>
            )}
            {selectedOrder.radiologistName && (
              <Text size="sm" c="dimmed">รังสีแพทย์: {selectedOrder.radiologistName}</Text>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
