// src/clients/apps/his/src/app/(main)/appointments/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select, Stack,
  Table, Text, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Patient = { id: string; hn: string; firstName: string; lastName: string; preName?: string };
type Doctor  = { id: string; firstName: string; lastName: string };
type Division = { id: string; code: string; name: string };
type Appointment = {
  id: string; patientId: string; patientName?: string; hn?: string;
  doctorId?: string; doctorName?: string;
  divisionId: string; divisionName?: string;
  scheduledDate: string; timeSlot: number; appointmentType: number;
  purpose?: string; notes?: string; status: number; createdDate: string;
};

const STATUS_LABEL: Record<number, string> = { 1: 'นัดหมาย', 2: 'ยืนยัน', 3: 'มาถึง', 4: 'เสร็จสิ้น', 8: 'ไม่มา', 9: 'ยกเลิก' };
const STATUS_COLOR: Record<number, string> = { 1: 'blue', 2: 'teal', 3: 'orange', 4: 'green', 8: 'gray', 9: 'red' };
const TIMESLOT_LABEL: Record<number, string> = { 1: 'เช้า', 2: 'บ่าย', 3: 'เย็น' };
const APPT_TYPE_LABEL: Record<number, string> = { 1: 'ติดตามผล', 2: 'ใหม่', 3: 'หัตถการ', 4: 'Lab', 9: 'อื่นๆ' };

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [apptOpen, { open: openAppt, close: closeAppt }] = useDisclosure(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [apptDate, setApptDate] = useState(today);
  const [timeSlot, setTimeSlot] = useState<string | null>('1');
  const [apptType, setApptType] = useState<string | null>('1');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDivId, setSelectedDivId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('');

  const { data: appointments = [], refetch } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: () => api.get<Appointment[]>(`/api/appointments?date=${selectedDate}`),
    refetchInterval: 30000,
  });

  const { data: patientResults = [] } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => api.get<{ items: Patient[] }>(`/api/patients?search=${encodeURIComponent(patientSearch)}`).then(r => r.items ?? []),
    enabled: patientSearch.length >= 2,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get<Doctor[]>('/api/masterdata/doctors'),
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => api.get<Division[]>('/api/admin/divisions'),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/appointments', {
      patientId: selectedPatient?.id,
      doctorId: selectedDoctorId,
      divisionId: selectedDivId ?? 'div-opd',
      scheduledDate: new Date(apptDate).toISOString(),
      timeSlot: Number(timeSlot),
      appointmentType: Number(apptType),
      purpose: purpose || null,
      notes: null,
      createdBy: null,
    }),
    onSuccess: () => {
      setSuccessMsg('สร้างนัดหมายสำเร็จ'); setErrorMsg('');
      closeAppt(); qc.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) =>
      api.patch(`/api/appointments/${id}/status`, { status, reason: null }),
    onSuccess: () => { setSuccessMsg('อัปเดตสถานะสำเร็จ'); qc.invalidateQueries({ queryKey: ['appointments'] }); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const checkInMutation = useMutation({
    mutationFn: async (a: Appointment) => {
      const enc = await api.post<{ encounterNo: string; queueItem?: { queueNo: string } }>(
        '/api/encounters', { patientId: a.patientId, divisionId: a.divisionId, type: 1 }
      );
      await api.patch(`/api/appointments/${a.id}/status`, { status: 3, reason: null });
      return enc;
    },
    onSuccess: (data) => {
      setSuccessMsg(`Check-in สำเร็จ — VN: ${data.encounterNo}  คิว: ${data.queueItem?.queueNo ?? '-'}`);
      setErrorMsg('');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['encounters'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const openNew = () => {
    setSelectedPatient(null); setPatientSearch(''); setApptDate(today);
    setTimeSlot('1'); setApptType('1'); setSelectedDoctorId(null);
    setSelectedDivId(null); setPurpose(''); setErrorMsg(''); openAppt();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH', { dateStyle: 'medium' });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>นัดหมายผู้ป่วย (Appointments)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={openNew}>+ นัดหมายใหม่</Button>
        </Group>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Group gap="sm">
        <Text size="sm" fw={500}>วันที่:</Text>
        <input
          type="date" value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 14 }}
        />
        <Badge variant="light">{appointments.length} นัด</Badge>
      </Group>

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ผู้ป่วย</Table.Th>
              <Table.Th>วันนัด</Table.Th>
              <Table.Th>ช่วงเวลา</Table.Th>
              <Table.Th>ประเภท</Table.Th>
              <Table.Th>แผนก / แพทย์</Table.Th>
              <Table.Th>วัตถุประสงค์</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {appointments.length === 0 ? (
              <Table.Tr><Table.Td colSpan={8}><Text ta="center" c="dimmed">ไม่มีนัดหมายวันนี้</Text></Table.Td></Table.Tr>
            ) : appointments.map(a => (
              <Table.Tr key={a.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{a.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{a.hn}</Text>
                </Table.Td>
                <Table.Td><Text size="sm">{formatDate(a.scheduledDate)}</Text></Table.Td>
                <Table.Td><Badge size="sm" variant="light">{TIMESLOT_LABEL[a.timeSlot]}</Badge></Table.Td>
                <Table.Td><Text size="sm">{APPT_TYPE_LABEL[a.appointmentType]}</Text></Table.Td>
                <Table.Td>
                  <Text size="sm">{a.divisionName ?? a.divisionId}</Text>
                  {a.doctorName && <Text size="xs" c="dimmed">{a.doctorName}</Text>}
                </Table.Td>
                <Table.Td><Text size="sm">{a.purpose ?? '-'}</Text></Table.Td>
                <Table.Td>
                  <Badge size="sm" color={STATUS_COLOR[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {a.status === 1 && <Button size="xs" color="teal" loading={checkInMutation.isPending} onClick={() => checkInMutation.mutate(a)}>มาถึง + สร้าง Visit</Button>}
                    {a.status === 3 && <Button size="xs" color="green" loading={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate({ id: a.id, status: 4 })}>เสร็จ</Button>}
                    {(a.status === 1 || a.status === 2) && <Button size="xs" color="red" variant="subtle" loading={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate({ id: a.id, status: 9 })}>ยกเลิก</Button>}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Create Modal */}
      <Modal opened={apptOpen} onClose={closeAppt} title="สร้างนัดหมายใหม่" size="lg">
        <Stack gap="sm">
          <TextInput label="ค้นหาผู้ป่วย" value={patientSearch}
            onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
            placeholder="HN / ชื่อ (2 ตัวอักษรขึ้นไป)" />
          {patientResults.length > 0 && !selectedPatient && (
            <Paper withBorder>
              {patientResults.map(p => (
                <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer' }}
                  onClick={() => { setSelectedPatient(p); setPatientSearch(`${p.preName ?? ''}${p.firstName} ${p.lastName}`); }}>
                  <Text size="sm" fw={500}>{(p.preName ?? '') + p.firstName + ' ' + p.lastName}</Text>
                  <Text size="xs" c="dimmed">HN: {p.hn}</Text>
                </div>
              ))}
            </Paper>
          )}

          <Group grow>
            <div>
              <Text size="sm" fw={500} mb={4}>วันนัด</Text>
              <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ced4da', borderRadius: 6 }} />
            </div>
            <Select label="ช่วงเวลา" value={timeSlot} onChange={setTimeSlot}
              data={[{ value: '1', label: 'เช้า' }, { value: '2', label: 'บ่าย' }, { value: '3', label: 'เย็น' }]} />
          </Group>

          <Group grow>
            <Select label="ประเภทนัด" value={apptType} onChange={setApptType}
              data={[{ value: '1', label: 'ติดตามผล' }, { value: '2', label: 'ผู้ป่วยใหม่' }, { value: '3', label: 'หัตถการ' }, { value: '4', label: 'Lab' }, { value: '9', label: 'อื่นๆ' }]} />
            <Select label="แผนก" value={selectedDivId} onChange={setSelectedDivId}
              data={divisions.map(d => ({ value: d.id, label: d.name }))} />
          </Group>

          <Select label="แพทย์ (ถ้ามี)" value={selectedDoctorId} onChange={setSelectedDoctorId} clearable
            data={doctors.map(d => ({ value: d.id, label: `${d.firstName} ${d.lastName}` }))} />

          <TextInput label="วัตถุประสงค์" value={purpose} onChange={e => setPurpose(e.target.value)}
            placeholder="เช่น ติดตามผล lab, ตรวจเบาหวาน..." />

          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeAppt}>ยกเลิก</Button>
            <Button loading={createMutation.isPending}
              disabled={!selectedPatient || !apptDate || !selectedDivId}
              onClick={() => createMutation.mutate()}>
              สร้างนัดหมาย
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
