// src/clients/apps/his/src/app/(main)/treatment/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select,
  Stack, Table, Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Encounter = { encounterId: string; encounterNo: string; hn: string; patientName: string };
type TreatmentRecord = {
  id: string; encounterId: string; patientName?: string; hn?: string;
  treatmentType: number; description: string; materials?: string;
  performedBy?: string; status: number; scheduledAt: string;
  completedAt?: string; outcomeNotes?: string;
};

const TYPE_LABEL: Record<number, string>   = {
  1: 'ทำแผล', 2: 'ให้น้ำเกลือ', 3: 'กายภาพบำบัด', 4: 'ฉีดยา', 5: 'เปลี่ยนผ้าพัน', 9: 'อื่นๆ',
};
const STATUS_LABEL: Record<number, string> = { 1: 'รอ', 2: 'เสร็จสิ้น', 9: 'ยกเลิก' };
const STATUS_COLOR: Record<number, string> = { 1: 'orange', 2: 'green', 9: 'red' };

export default function TreatmentPage() {
  const qc = useQueryClient();
  const [createOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [completeOpen, { open: openComplete, close: closeComplete }] = useDisclosure(false);
  const [selected, setSelected] = useState<TreatmentRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedEnc, setSelectedEnc] = useState<string | null>(null);
  const [treatType, setTreatType] = useState<string | null>('1');
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const { data: records = [], refetch } = useQuery({
    queryKey: ['treatment-records'],
    queryFn: () => api.get<TreatmentRecord[]>('/api/treatment-records'),
    refetchInterval: 30000,
  });

  const { data: encounters = [] } = useQuery({
    queryKey: ['all-encounters-opd-ipd'],
    queryFn: async () => {
      const [opd, ipd] = await Promise.all([
        api.get<Encounter[]>('/api/queue?status=3'),
        api.get<Encounter[]>('/api/admissions'),
      ]);
      return [...ipd, ...opd];
    },
    enabled: createOpen,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/treatment-records', {
      encounterId: selectedEnc, treatmentType: Number(treatType),
      description, materials: materials || null, performedBy: performedBy || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกหัตถการสำเร็จ'); setErrorMsg('');
      closeCreate(); qc.invalidateQueries({ queryKey: ['treatment-records'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/api/treatment-records/${selected!.id}/complete`,
      { outcomeNotes: outcomeNotes || null }),
    onSuccess: () => {
      setSuccessMsg('บันทึกผลสำเร็จ'); setErrorMsg(''); closeComplete(); refetch();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/treatment-records/${id}/cancel`, {}),
    onSuccess: () => { setSuccessMsg('ยกเลิกสำเร็จ'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ห้องทำหัตถการ (Treatment Room)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={() => {
            setSelectedEnc(null); setTreatType('1'); setDescription(''); setMaterials('');
            setPerformedBy(''); setScheduledAt(''); setErrorMsg(''); openCreate();
          }}>+ บันทึกหัตถการ</Button>
        </Group>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ผู้ป่วย</Table.Th>
              <Table.Th>ประเภท</Table.Th>
              <Table.Th>รายละเอียด</Table.Th>
              <Table.Th>ผู้ทำ</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {records.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีบันทึกหัตถการ</Text></Table.Td></Table.Tr>
            ) : records.map(r => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{r.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{r.hn ?? '-'}</Text>
                </Table.Td>
                <Table.Td><Badge size="sm" variant="light">{TYPE_LABEL[r.treatmentType] ?? '-'}</Badge></Table.Td>
                <Table.Td><Text size="sm">{r.description}</Text></Table.Td>
                <Table.Td><Text size="sm">{r.performedBy ?? '-'}</Text></Table.Td>
                <Table.Td><Badge size="sm" color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {r.status === 1 && (
                      <Button size="xs" color="green" variant="outline"
                        onClick={() => { setSelected(r); setOutcomeNotes(''); openComplete(); }}>เสร็จสิ้น</Button>
                    )}
                    {r.status === 1 && (
                      <Button size="xs" color="red" variant="subtle"
                        loading={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(r.id)}>ยกเลิก</Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createOpen} onClose={closeCreate} title="บันทึกหัตถการ">
        <Stack gap="sm">
          <Select label="ผู้ป่วย" placeholder="เลือกผู้ป่วย..." searchable
            data={encounters.map(e => ({ value: e.encounterId, label: `${e.patientName} (${e.hn})` }))}
            value={selectedEnc} onChange={setSelectedEnc} />
          <Select label="ประเภทหัตถการ" data={[
            { value: '1', label: 'ทำแผล' }, { value: '2', label: 'ให้น้ำเกลือ (IV)' },
            { value: '3', label: 'กายภาพบำบัด' }, { value: '4', label: 'ฉีดยา' },
            { value: '5', label: 'เปลี่ยนผ้าพัน' }, { value: '9', label: 'อื่นๆ' },
          ]} value={treatType} onChange={setTreatType} />
          <Textarea label="รายละเอียด" rows={3} value={description} onChange={e => setDescription(e.target.value)} required />
          <TextInput label="วัสดุ/อุปกรณ์ที่ใช้" value={materials} onChange={e => setMaterials(e.target.value)} />
          <TextInput label="ผู้ทำหัตถการ" value={performedBy} onChange={e => setPerformedBy(e.target.value)} />
          <TextInput label="เวลานัดทำ" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreate}>ยกเลิก</Button>
            <Button color="blue" loading={createMutation.isPending}
              disabled={!selectedEnc || !description} onClick={() => createMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={completeOpen} onClose={closeComplete} title="บันทึกผลหัตถการ">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">{selected?.description}</Text>
          <Textarea label="ผลลัพธ์/บันทึกเพิ่มเติม" rows={4} value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeComplete}>ยกเลิก</Button>
            <Button color="green" loading={completeMutation.isPending} onClick={() => completeMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
