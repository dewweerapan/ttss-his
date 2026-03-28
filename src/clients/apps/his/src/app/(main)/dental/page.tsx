// src/clients/apps/his/src/app/(main)/dental/page.tsx
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
type DentalRecord = {
  id: string; encounterId: string; patientName?: string; hn?: string;
  procedureType: number; toothNumbers?: string; chiefComplaint?: string;
  findings?: string; treatment?: string; materials?: string;
  dentistName?: string; nextAppointment?: string; visitDate: string;
};

const PROC_LABEL: Record<number, string> = {
  1: 'ตรวจสุขภาพช่องปาก', 2: 'อุดฟัน', 3: 'ถอนฟัน', 4: 'รักษารากฟัน',
  5: 'ขูดหินปูน', 6: 'ใส่ฟันปลอม', 7: 'จัดฟัน', 8: 'ผ่าตัดช่องปาก', 9: 'อื่นๆ',
};

export default function DentalPage() {
  const qc = useQueryClient();
  const [createOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedEnc, setSelectedEnc] = useState<string | null>(null);
  const [procType, setProcType] = useState<string | null>('1');
  const [toothNumbers, setToothNumbers] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [findings, setFindings] = useState('');
  const [treatment, setTreatment] = useState('');
  const [materials, setMaterials] = useState('');
  const [dentistName, setDentistName] = useState('');
  const [nextAppt, setNextAppt] = useState('');

  const { data: records = [], refetch } = useQuery({
    queryKey: ['dental-records'],
    queryFn: () => api.get<DentalRecord[]>('/api/dental-records'),
    refetchInterval: 60000,
  });

  const { data: encounters = [] } = useQuery({
    queryKey: ['active-encounters'],
    queryFn: () => api.get<Encounter[]>('/api/queue?status=3'),
    enabled: createOpen,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/dental-records', {
      encounterId: selectedEnc, procedureType: Number(procType),
      toothNumbers: toothNumbers || null, chiefComplaint: chiefComplaint || null,
      findings: findings || null, treatment: treatment || null,
      materials: materials || null, dentistName: dentistName || null,
      nextAppointment: nextAppt || null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกทันตกรรมสำเร็จ'); setErrorMsg('');
      closeCreate(); qc.invalidateQueries({ queryKey: ['dental-records'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/dental-records/${id}`),
    onSuccess: () => { setSuccessMsg('ลบบันทึกสำเร็จ'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ทันตกรรม (Dental)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={() => {
            setSelectedEnc(null); setProcType('1'); setToothNumbers(''); setChiefComplaint('');
            setFindings(''); setTreatment(''); setMaterials(''); setDentistName(''); setNextAppt('');
            setErrorMsg(''); openCreate();
          }}>+ บันทึกทันตกรรม</Button>
        </Group>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ผู้ป่วย</Table.Th>
              <Table.Th>หัตถการ</Table.Th>
              <Table.Th>ซี่ฟัน</Table.Th>
              <Table.Th>ทันตแพทย์</Table.Th>
              <Table.Th>วันที่</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {records.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีบันทึกทันตกรรม</Text></Table.Td></Table.Tr>
            ) : records.map(r => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{r.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{r.hn ?? '-'}</Text>
                </Table.Td>
                <Table.Td><Badge size="sm" variant="light">{PROC_LABEL[r.procedureType] ?? '-'}</Badge></Table.Td>
                <Table.Td><Text size="sm">{r.toothNumbers ?? '-'}</Text></Table.Td>
                <Table.Td><Text size="sm">{r.dentistName ?? '-'}</Text></Table.Td>
                <Table.Td><Text size="xs">{new Date(r.visitDate).toLocaleDateString('th-TH')}</Text></Table.Td>
                <Table.Td>
                  <Button size="xs" color="red" variant="subtle"
                    loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(r.id)}>ลบ</Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createOpen} onClose={closeCreate} title="บันทึกทันตกรรม" size="lg">
        <Stack gap="sm">
          <Select label="ผู้ป่วย (VN)" placeholder="เลือกผู้ป่วย..." searchable
            data={encounters.map(e => ({ value: e.encounterId, label: `${e.patientName} (${e.hn})` }))}
            value={selectedEnc} onChange={setSelectedEnc} />
          <Group grow>
            <Select label="หัตถการ" data={Object.entries(PROC_LABEL).map(([k, v]) => ({ value: k, label: v }))}
              value={procType} onChange={setProcType} />
            <TextInput label="ซี่ฟัน (เช่น 16,17)" value={toothNumbers} onChange={e => setToothNumbers(e.target.value)} />
          </Group>
          <TextInput label="อาการหลัก" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} />
          <Textarea label="ผลการตรวจ" rows={2} value={findings} onChange={e => setFindings(e.target.value)} />
          <Textarea label="การรักษา" rows={2} value={treatment} onChange={e => setTreatment(e.target.value)} />
          <Group grow>
            <TextInput label="วัสดุที่ใช้" value={materials} onChange={e => setMaterials(e.target.value)} />
            <TextInput label="ทันตแพทย์" value={dentistName} onChange={e => setDentistName(e.target.value)} />
          </Group>
          <TextInput label="นัดครั้งต่อไป" value={nextAppt} onChange={e => setNextAppt(e.target.value)} placeholder="เช่น 2 สัปดาห์" />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreate}>ยกเลิก</Button>
            <Button color="blue" loading={createMutation.isPending}
              disabled={!selectedEnc} onClick={() => createMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
