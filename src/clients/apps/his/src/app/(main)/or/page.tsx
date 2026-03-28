// src/clients/apps/his/src/app/(main)/or/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select, Stack,
  Table, Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type IpdEncounter = { encounterId: string; encounterNo: string; hn: string; patientName: string };
type SurgeryCase = {
  id: string; encounterId: string; patientName?: string; hn?: string;
  procedureName: string; operatingRoom?: string; status: number;
  scheduledAt: string; startedAt?: string; endedAt?: string;
  surgeonName?: string; anesthesiaType?: string; preOpDiagnosis?: string;
  postOpDiagnosis?: string; operativeNotes?: string;
};

const STATUS_LABEL: Record<number, string> = { 1: 'นัดหมาย', 2: 'กำลังผ่าตัด', 3: 'เสร็จสิ้น', 9: 'ยกเลิก' };
const STATUS_COLOR: Record<number, string>  = { 1: 'blue', 2: 'orange', 3: 'green', 9: 'red' };

export default function OrPage() {
  const qc = useQueryClient();
  const [scheduleOpen, { open: openSchedule, close: closeSchedule }] = useDisclosure(false);
  const [completeOpen, { open: openComplete, close: closeComplete }] = useDisclosure(false);
  const [selectedCase, setSelectedCase] = useState<SurgeryCase | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Schedule form
  const [encSearch, setEncSearch] = useState('');
  const [selectedEnc, setSelectedEnc] = useState<IpdEncounter | null>(null);
  const [procedure, setProcedure] = useState('');
  const [orRoom, setOrRoom] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [surgeonName, setSurgeonName] = useState('');
  const [anesthesiaType, setAnesthesiaType] = useState<string | null>('GA');
  const [preOpDx, setPreOpDx] = useState('');

  // Complete form
  const [postOpDx, setPostOpDx] = useState('');
  const [opNotes, setOpNotes] = useState('');

  const { data: cases = [], refetch } = useQuery({
    queryKey: ['surgery-cases'],
    queryFn: () => api.get<SurgeryCase[]>('/api/surgery-cases'),
    refetchInterval: 60000,
  });

  const { data: ipdList = [] } = useQuery({
    queryKey: ['admissions'],
    queryFn: () => api.get<IpdEncounter[]>('/api/admissions'),
    enabled: scheduleOpen,
  });

  const scheduleMutation = useMutation({
    mutationFn: () => api.post('/api/surgery-cases', {
      encounterId: selectedEnc?.encounterId,
      procedureName: procedure,
      operatingRoom: orRoom || null,
      scheduledAt: new Date(scheduledAt).toISOString(),
      surgeonName: surgeonName || null,
      anesthesiaType: anesthesiaType,
      preOpDiagnosis: preOpDx || null,
    }),
    onSuccess: () => {
      setSuccessMsg('นัดผ่าตัดสำเร็จ'); setErrorMsg('');
      closeSchedule(); qc.invalidateQueries({ queryKey: ['surgery-cases'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/surgery-cases/${id}/start`, {}),
    onSuccess: () => { setSuccessMsg('เริ่มผ่าตัดแล้ว'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/api/surgery-cases/${selectedCase!.id}/complete`, {
      postOpDiagnosis: postOpDx || null, operativeNotes: opNotes || null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกผลการผ่าตัดสำเร็จ'); setErrorMsg('');
      closeComplete(); refetch();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/surgery-cases/${id}/cancel`, {}),
    onSuccess: () => { setSuccessMsg('ยกเลิกการผ่าตัดแล้ว'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const handleOpenSchedule = () => {
    setSelectedEnc(null); setEncSearch(''); setProcedure(''); setOrRoom('');
    setScheduledAt(''); setSurgeonName(''); setAnesthesiaType('GA'); setPreOpDx('');
    setErrorMsg(''); openSchedule();
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ห้องผ่าตัด (Operating Room)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={handleOpenSchedule}>+ นัดผ่าตัด</Button>
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
              <Table.Th>ห้อง OR</Table.Th>
              <Table.Th>แพทย์ผ่าตัด</Table.Th>
              <Table.Th>วันที่นัด</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {cases.length === 0 ? (
              <Table.Tr><Table.Td colSpan={7}><Text ta="center" c="dimmed">ไม่มีตารางผ่าตัด</Text></Table.Td></Table.Tr>
            ) : cases.map(c => (
              <Table.Tr key={c.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{c.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{c.hn ?? '-'}</Text>
                </Table.Td>
                <Table.Td><Text size="sm">{c.procedureName}</Text></Table.Td>
                <Table.Td><Text size="sm">{c.operatingRoom ?? '-'}</Text></Table.Td>
                <Table.Td><Text size="sm">{c.surgeonName ?? '-'}</Text></Table.Td>
                <Table.Td><Text size="xs">{new Date(c.scheduledAt).toLocaleString('th-TH')}</Text></Table.Td>
                <Table.Td><Badge size="sm" color={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {c.status === 1 && (
                      <Button size="xs" color="orange" variant="outline"
                        loading={startMutation.isPending}
                        onClick={() => startMutation.mutate(c.id)}>เริ่ม</Button>
                    )}
                    {c.status === 2 && (
                      <Button size="xs" color="green" variant="outline"
                        onClick={() => { setSelectedCase(c); setPostOpDx(''); setOpNotes(''); openComplete(); }}>บันทึกผล</Button>
                    )}
                    {(c.status === 1 || c.status === 2) && (
                      <Button size="xs" color="red" variant="subtle"
                        loading={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(c.id)}>ยกเลิก</Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Schedule Modal */}
      <Modal opened={scheduleOpen} onClose={closeSchedule} title="นัดหมายผ่าตัด" size="lg">
        <Stack gap="sm">
          <Select
            label="ผู้ป่วยใน (IPD)"
            placeholder="เลือกผู้ป่วย..."
            searchable
            data={ipdList.map(e => ({ value: e.encounterId, label: `${e.patientName} (${e.hn})` }))}
            value={selectedEnc?.encounterId ?? null}
            onChange={v => setSelectedEnc(ipdList.find(e => e.encounterId === v) ?? null)}
          />
          <TextInput label="หัตถการ/ชื่อการผ่าตัด" value={procedure} onChange={e => setProcedure(e.target.value)} required />
          <Group grow>
            <TextInput label="ห้อง OR" value={orRoom} onChange={e => setOrRoom(e.target.value)} placeholder="OR-1" />
            <TextInput label="วัน-เวลาผ่าตัด" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </Group>
          <Group grow>
            <TextInput label="แพทย์ผ่าตัด" value={surgeonName} onChange={e => setSurgeonName(e.target.value)} />
            <Select
              label="ประเภทยาสลบ"
              data={['GA', 'Spinal', 'Epidural', 'Local', 'MAC', 'Other']}
              value={anesthesiaType} onChange={setAnesthesiaType}
            />
          </Group>
          <TextInput label="การวินิจฉัยก่อนผ่าตัด (Pre-op Dx)" value={preOpDx} onChange={e => setPreOpDx(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeSchedule}>ยกเลิก</Button>
            <Button color="blue" loading={scheduleMutation.isPending}
              disabled={!selectedEnc || !procedure || !scheduledAt}
              onClick={() => scheduleMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Complete Modal */}
      <Modal opened={completeOpen} onClose={closeComplete} title="บันทึกผลการผ่าตัด">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">หัตถการ: <strong>{selectedCase?.procedureName}</strong></Text>
          <TextInput label="Post-op Diagnosis" value={postOpDx} onChange={e => setPostOpDx(e.target.value)} />
          <Textarea label="Operative Notes" rows={5} value={opNotes} onChange={e => setOpNotes(e.target.value)} />
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
