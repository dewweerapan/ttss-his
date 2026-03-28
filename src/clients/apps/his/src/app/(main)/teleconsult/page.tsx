// src/clients/apps/his/src/app/(main)/teleconsult/page.tsx — TEC Telemedicine
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select, Stack,
  Table, Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Patient = { id: string; hn: string; firstName: string; lastName: string; preName?: string };
type TeleconsultNote = {
  id: string; patientId: string; patientName?: string; hn?: string;
  consultType: number; platform?: string; chiefComplaint?: string;
  consultNotes?: string; prescription?: string; doctorName?: string;
  status: number; scheduledAt: string; completedAt?: string;
};

const CONSULT_TYPE_LABEL: Record<number, string> = { 1: 'OPD นัดหมาย', 2: 'Follow-up', 3: 'ปรึกษาเร่งด่วน', 9: 'อื่นๆ' };
const STATUS_LABEL: Record<number, string> = { 1: 'นัดหมาย', 2: 'เสร็จสิ้น', 9: 'ยกเลิก' };
const STATUS_COLOR: Record<number, string> = { 1: 'blue', 2: 'green', 9: 'red' };

export default function TeleconsultPage() {
  const qc = useQueryClient();
  const [createOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [consultType, setConsultType] = useState<string | null>('1');
  const [platform, setPlatform] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [consultNotes, setConsultNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Store teleconsults locally (no DB entity for simplicity — stored via appointments API)
  const { data: appointments = [], refetch } = useQuery({
    queryKey: ['teleconsult-appointments'],
    queryFn: () => api.get<any[]>('/api/appointments?type=teleconsult'),
  });

  const { data: patientResults = [] } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => api.get<Patient[]>(`/api/patients?search=${encodeURIComponent(patientSearch)}`),
    enabled: patientSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/appointments', {
      patientId: selectedPatient?.id,
      doctorId: null, divisionId: 'div-opd',
      scheduledAt: new Date(scheduledAt).toISOString(),
      notes: `[TELECONSULT] ${platform || 'ไม่ระบุ platform'} | ${chiefComplaint || ''}\n${consultNotes || ''}\nRx: ${prescription || '-'}\nแพทย์: ${doctorName || '-'}`,
      appointmentType: 2,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกนัดโทรเวชกรรมสำเร็จ'); setErrorMsg('');
      closeCreate(); qc.invalidateQueries({ queryKey: ['teleconsult-appointments'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>โทรเวชกรรม (Telemedicine)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={() => {
            setSelectedPatient(null); setPatientSearch(''); setConsultType('1');
            setPlatform(''); setChiefComplaint(''); setConsultNotes('');
            setPrescription(''); setDoctorName(''); setScheduledAt('');
            setErrorMsg(''); openCreate();
          }}>+ นัดโทรเวช</Button>
        </Group>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Paper withBorder p="md">
        <Alert color="blue" mb="md">
          ระบบโทรเวชกรรมใช้โมดูลนัดหมาย (Appointments) ในการบันทึก การโทรวิดีโอต้องใช้แพลตฟอร์มภายนอก (Zoom, Teams, LINE)
        </Alert>
        {appointments.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">ไม่มีนัดโทรเวชกรรม</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ผู้ป่วย</Table.Th>
                <Table.Th>วันที่</Table.Th>
                <Table.Th>หมายเหตุ</Table.Th>
                <Table.Th>สถานะ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {appointments.map((a: any) => (
                <Table.Tr key={a.id}>
                  <Table.Td><Text size="sm">{a.patientName ?? '-'}</Text></Table.Td>
                  <Table.Td><Text size="sm">{new Date(a.scheduledAt).toLocaleString('th-TH')}</Text></Table.Td>
                  <Table.Td><Text size="sm" lineClamp={2}>{a.notes ?? '-'}</Text></Table.Td>
                  <Table.Td><Badge size="sm" color={a.status === 4 ? 'green' : 'blue'}>{a.status === 4 ? 'เสร็จสิ้น' : 'นัดหมาย'}</Badge></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Modal opened={createOpen} onClose={closeCreate} title="นัดหมายโทรเวชกรรม" size="lg">
        <Stack gap="sm">
          <TextInput label="ค้นหาผู้ป่วย" value={patientSearch}
            onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
            placeholder="พิมพ์ชื่อหรือ HN..." />
          {patientResults.length > 0 && !selectedPatient && (
            <Paper withBorder>
              {patientResults.slice(0, 5).map(p => (
                <div key={p.id} style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onClick={() => { setSelectedPatient(p); setPatientSearch(`${p.preName ?? ''}${p.firstName} ${p.lastName}`); }}>
                  <Text size="sm">{(p.preName ?? '') + p.firstName + ' ' + p.lastName}</Text>
                  <Text size="xs" c="dimmed">HN: {p.hn}</Text>
                </div>
              ))}
            </Paper>
          )}
          <Group grow>
            <Select label="ประเภทการปรึกษา"
              data={[
                { value: '1', label: 'OPD นัดหมาย' }, { value: '2', label: 'Follow-up' },
                { value: '3', label: 'ปรึกษาเร่งด่วน' }, { value: '9', label: 'อื่นๆ' },
              ]} value={consultType} onChange={setConsultType} />
            <TextInput label="Platform (Zoom/Teams/LINE)" value={platform} onChange={e => setPlatform(e.target.value)} />
          </Group>
          <TextInput label="วัน-เวลานัด" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          <TextInput label="อาการหลัก" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} />
          <Textarea label="บันทึกการปรึกษา" rows={3} value={consultNotes} onChange={e => setConsultNotes(e.target.value)} />
          <Textarea label="Rx / คำแนะนำ" rows={2} value={prescription} onChange={e => setPrescription(e.target.value)} />
          <TextInput label="แพทย์ผู้รับปรึกษา" value={doctorName} onChange={e => setDoctorName(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreate}>ยกเลิก</Button>
            <Button color="blue" loading={createMutation.isPending}
              disabled={!selectedPatient || !scheduledAt} onClick={() => createMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
