// src/clients/apps/his/src/app/(main)/hemodialysis/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, NumberInput, Paper, Select,
  Stack, Table, Text, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type IpdEncounter = { encounterId: string; encounterNo: string; hn: string; patientName: string };
type DialysisSession = {
  id: string; encounterId: string; patientName?: string; hn?: string;
  dialysisType: number; machineNo?: string; status: number;
  scheduledAt: string; startedAt?: string; endedAt?: string;
  preWeight?: number; postWeight?: number; ufGoal?: number; ufAchieved?: number;
  accessType?: string; complications?: string;
};

const TYPE_LABEL: Record<number, string>   = { 1: 'HD', 2: 'HDF', 3: 'CRRT', 4: 'PD' };
const STATUS_LABEL: Record<number, string> = { 1: 'นัดหมาย', 2: 'กำลังทำ', 3: 'เสร็จสิ้น', 9: 'ยกเลิก' };
const STATUS_COLOR: Record<number, string> = { 1: 'blue', 2: 'orange', 3: 'green', 9: 'red' };
const ACCESS_TYPES = ['AVF', 'AVG', 'CVC (Temp)', 'CVC (Perm)', 'PD Catheter'];

export default function HemodialysisPage() {
  const qc = useQueryClient();
  const [scheduleOpen, { open: openSchedule, close: closeSchedule }] = useDisclosure(false);
  const [startOpen, { open: openStart, close: closeStart }] = useDisclosure(false);
  const [completeOpen, { open: openComplete, close: closeComplete }] = useDisclosure(false);
  const [selected, setSelected] = useState<DialysisSession | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedEnc, setSelectedEnc] = useState<string | null>(null);
  const [dialysisType, setDialysisType] = useState<string | null>('1');
  const [machineNo, setMachineNo] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [ufGoal, setUfGoal] = useState<number | string>('');
  const [accessType, setAccessType] = useState<string | null>('AVF');
  const [preWeight, setPreWeight] = useState<number | string>('');
  const [postWeight, setPostWeight] = useState<number | string>('');
  const [ufAchieved, setUfAchieved] = useState<number | string>('');
  const [complications, setComplications] = useState('');

  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['dialysis-sessions'],
    queryFn: () => api.get<DialysisSession[]>('/api/dialysis-sessions'),
    refetchInterval: 60000,
  });

  const { data: ipdList = [] } = useQuery({
    queryKey: ['admissions'],
    queryFn: () => api.get<IpdEncounter[]>('/api/admissions'),
    enabled: scheduleOpen,
  });

  const scheduleMutation = useMutation({
    mutationFn: () => api.post('/api/dialysis-sessions', {
      encounterId: selectedEnc, dialysisType: Number(dialysisType),
      machineNo: machineNo || null, scheduledAt: new Date(scheduledAt).toISOString(),
      ufGoal: ufGoal !== '' ? Number(ufGoal) : null, accessType,
    }),
    onSuccess: () => {
      setSuccessMsg('นัดหมายฟอกไตสำเร็จ'); setErrorMsg('');
      closeSchedule(); qc.invalidateQueries({ queryKey: ['dialysis-sessions'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const startMutation = useMutation({
    mutationFn: () => api.patch(`/api/dialysis-sessions/${selected!.id}/start`,
      { preWeight: preWeight !== '' ? Number(preWeight) : null }),
    onSuccess: () => {
      setSuccessMsg('เริ่มฟอกไตแล้ว'); setErrorMsg(''); closeStart(); refetch();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/api/dialysis-sessions/${selected!.id}/complete`, {
      postWeight: postWeight !== '' ? Number(postWeight) : null,
      ufAchieved: ufAchieved !== '' ? Number(ufAchieved) : null,
      complications: complications || null, notes: null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกผลการฟอกไตสำเร็จ'); setErrorMsg(''); closeComplete(); refetch();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ฟอกไต (Hemodialysis)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={() => { setSelectedEnc(null); setDialysisType('1'); setMachineNo(''); setScheduledAt(''); setUfGoal(''); setAccessType('AVF'); setErrorMsg(''); openSchedule(); }}>
            + นัดหมาย
          </Button>
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
              <Table.Th>เครื่อง</Table.Th>
              <Table.Th>วันที่นัด</Table.Th>
              <Table.Th>น้ำหนัก (ก่อน/หลัง)</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sessions.length === 0 ? (
              <Table.Tr><Table.Td colSpan={7}><Text ta="center" c="dimmed">ไม่มีตารางฟอกไต</Text></Table.Td></Table.Tr>
            ) : sessions.map(s => (
              <Table.Tr key={s.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{s.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{s.hn ?? '-'}</Text>
                </Table.Td>
                <Table.Td><Badge size="sm" variant="light">{TYPE_LABEL[s.dialysisType]}</Badge></Table.Td>
                <Table.Td><Text size="sm">{s.machineNo ?? '-'}</Text></Table.Td>
                <Table.Td><Text size="xs">{new Date(s.scheduledAt).toLocaleString('th-TH')}</Text></Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {s.preWeight ?? '-'} / {s.postWeight ?? '-'} kg
                  </Text>
                </Table.Td>
                <Table.Td><Badge size="sm" color={STATUS_COLOR[s.status]}>{STATUS_LABEL[s.status]}</Badge></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {s.status === 1 && (
                      <Button size="xs" color="orange" variant="outline"
                        onClick={() => { setSelected(s); setPreWeight(''); openStart(); }}>เริ่ม</Button>
                    )}
                    {s.status === 2 && (
                      <Button size="xs" color="green" variant="outline"
                        onClick={() => { setSelected(s); setPostWeight(''); setUfAchieved(''); setComplications(''); openComplete(); }}>เสร็จสิ้น</Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={scheduleOpen} onClose={closeSchedule} title="นัดหมายฟอกไต">
        <Stack gap="sm">
          <Select label="ผู้ป่วย" placeholder="เลือกผู้ป่วย..." searchable
            data={ipdList.map(e => ({ value: e.encounterId, label: `${e.patientName} (${e.hn})` }))}
            value={selectedEnc} onChange={setSelectedEnc} />
          <Group grow>
            <Select label="ประเภท" data={[
              { value: '1', label: 'HD' }, { value: '2', label: 'HDF' },
              { value: '3', label: 'CRRT' }, { value: '4', label: 'PD' },
            ]} value={dialysisType} onChange={setDialysisType} />
            <TextInput label="เครื่องเบอร์" value={machineNo} onChange={e => setMachineNo(e.target.value)} placeholder="เช่น HD-01" />
          </Group>
          <TextInput label="วัน-เวลานัด" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          <Group grow>
            <Select label="Access Type" data={ACCESS_TYPES} value={accessType} onChange={setAccessType} />
            <NumberInput label="UF Goal (mL)" value={ufGoal} onChange={setUfGoal} min={0} />
          </Group>
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeSchedule}>ยกเลิก</Button>
            <Button color="blue" loading={scheduleMutation.isPending}
              disabled={!selectedEnc || !scheduledAt} onClick={() => scheduleMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={startOpen} onClose={closeStart} title="เริ่มฟอกไต">
        <Stack gap="sm">
          <NumberInput label="น้ำหนักก่อนฟอก (kg)" value={preWeight} onChange={setPreWeight} decimalScale={1} step={0.1} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeStart}>ยกเลิก</Button>
            <Button color="orange" loading={startMutation.isPending} onClick={() => startMutation.mutate()}>เริ่ม</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={completeOpen} onClose={closeComplete} title="บันทึกผลการฟอกไต">
        <Stack gap="sm">
          <Group grow>
            <NumberInput label="น้ำหนักหลังฟอก (kg)" value={postWeight} onChange={setPostWeight} decimalScale={1} step={0.1} />
            <NumberInput label="UF Achieved (mL)" value={ufAchieved} onChange={setUfAchieved} min={0} />
          </Group>
          <TextInput label="ภาวะแทรกซ้อน" value={complications} onChange={e => setComplications(e.target.value)} placeholder="ถ้ามี" />
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
