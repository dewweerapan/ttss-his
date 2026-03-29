// src/clients/apps/his/src/app/(main)/admissions/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select, Stack,
  Table, Text, TextInput, Title,
} from '@mantine/core';
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Patient = { id: string; hn: string; firstName: string; lastName: string; preName?: string };
type Ward    = { id: string; code: string; name: string; type: number; totalBeds: number };
type Bed     = { id: string; bedNo: string; wardId: string; status: number };
type Doctor  = { id: string; firstName: string; lastName: string };
type IpdEncounter = {
  encounterId: string; encounterNo: string; hn: string; patientName: string;
  bedNumber?: string; divisionId: string; status: number;
  admissionDate: string; dischargeDate?: string;
};

const ENC_STATUS_LABEL: Record<number, string> = { 2: 'รับไว้', 3: 'จำหน่ายแล้ว', 4: 'ปิด' };
const ENC_STATUS_COLOR: Record<number, string> = { 2: 'blue', 3: 'green', 4: 'gray' };

export default function AdmissionsPage() {
  const qc = useQueryClient();

  const [admitOpen, { open: openAdmit, close: closeAdmit }] = useDisclosure(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedPatientSearch] = useDebouncedValue(patientSearch, 300);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedEncounter, setSelectedEncounter] = useState<IpdEncounter | null>(null);
  const [transferOpen, { open: openTransfer, close: closeTransfer }] = useDisclosure(false);
  const [newBedId, setNewBedId] = useState<string | null>(null);
  const [allAvailableBeds, setAllAvailableBeds] = useState<Bed[]>([]);

  const { data: encounters = [], refetch } = useQuery({
    queryKey: ['admissions'],
    queryFn: () => api.get<IpdEncounter[]>('/api/admissions'),
    refetchInterval: 30000,
  });

  const { data: wards = [] } = useQuery({
    queryKey: ['wards'],
    queryFn: () => api.get<Ward[]>('/api/wards'),
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['wards', selectedWardId, 'beds'],
    queryFn: () => api.get<Bed[]>(`/api/wards/${selectedWardId}/beds`),
    enabled: !!selectedWardId,
  });

  const { data: patientResults = [] } = useQuery({
    queryKey: ['patients', 'search', debouncedPatientSearch],
    queryFn: () => api.get<Patient[]>(
      debouncedPatientSearch
        ? `/api/patients?search=${encodeURIComponent(debouncedPatientSearch)}&pageSize=20`
        : `/api/patients?pageSize=20`
    ),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get<Doctor[]>('/api/masterdata/doctors'),
  });

  const admitMutation = useMutation({
    mutationFn: () => api.post('/api/admissions', {
      patientId: selectedPatient?.id,
      bedId: selectedBedId,
      divisionId: null,
      doctorId: selectedDoctorId,
      chiefComplaint,
    }),
    onSuccess: () => {
      setSuccessMsg('รับผู้ป่วยเข้าหอผู้ป่วยสำเร็จ');
      setErrorMsg('');
      closeAdmit();
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['wards'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const dischargeMutation = useMutation({
    mutationFn: (encounterId: string) => api.patch(`/api/encounters/${encounterId}/discharge-ipd`, {}),
    onSuccess: () => {
      setSuccessMsg('จำหน่ายผู้ป่วยสำเร็จ');
      setErrorMsg('');
      setSelectedEncounter(null);
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['wards'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const transferMutation = useMutation({
    mutationFn: ({ encounterId, bedId }: { encounterId: string; bedId: string }) =>
      api.patch(`/api/admissions/${encounterId}/transfer`, { newBedId: bedId }),
    onSuccess: () => {
      setSuccessMsg('ย้ายเตียงสำเร็จ');
      setErrorMsg('');
      closeTransfer();
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['wards'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const availableBeds = beds.filter(b => b.status === 1);

  const handleOpenAdmit = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setSelectedWardId(null);
    setSelectedBedId(null);
    setSelectedDoctorId(null);
    setChiefComplaint('');
    setErrorMsg('');
    openAdmit();
  };

  const handleOpenTransfer = async () => {
    const allW = await api.get<Ward[]>('/api/wards');
    const bedLists = await Promise.all(allW.map(w => api.get<Bed[]>(`/api/wards/${w.id}/beds`)));
    setAllAvailableBeds(bedLists.flat().filter(b => b.status === 1));
    setNewBedId(null);
    openTransfer();
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>การรับผู้ป่วยใน (IPD Admissions)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={handleOpenAdmit}>+ รับผู้ป่วยใหม่</Button>
        </Group>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 460, flexShrink: 0 }}>
          <Paper withBorder>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ผู้ป่วย</Table.Th>
                  <Table.Th>AN</Table.Th>
                  <Table.Th>เตียง</Table.Th>
                  <Table.Th>สถานะ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {encounters.length === 0 ? (
                  <Table.Tr><Table.Td colSpan={4}><Text ta="center" c="dimmed">ไม่มีผู้ป่วยใน</Text></Table.Td></Table.Tr>
                ) : encounters.map(enc => (
                  <Table.Tr
                    key={enc.encounterId}
                    onClick={() => setSelectedEncounter(enc)}
                    style={{ cursor: 'pointer', background: selectedEncounter?.encounterId === enc.encounterId ? '#e8f4fd' : undefined }}
                  >
                    <Table.Td>
                      <Text size="sm" fw={500}>{enc.patientName}</Text>
                      <Text size="xs" c="dimmed">{enc.hn}</Text>
                    </Table.Td>
                    <Table.Td><Text size="sm">{enc.encounterNo}</Text></Table.Td>
                    <Table.Td><Text size="sm">{enc.bedNumber ?? '-'}</Text></Table.Td>
                    <Table.Td>
                      <Badge size="sm" color={ENC_STATUS_COLOR[enc.status] ?? 'gray'}>
                        {ENC_STATUS_LABEL[enc.status] ?? '-'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </div>

        <div style={{ flex: 1 }}>
          {!selectedEncounter ? (
            <Paper withBorder p="xl">
              <Text ta="center" c="dimmed">เลือกผู้ป่วยจากรายชื่อด้านซ้าย</Text>
            </Paper>
          ) : (
            <Paper withBorder p="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text fw={600} size="lg">{selectedEncounter.patientName}</Text>
                    <Text size="sm" c="dimmed">HN: {selectedEncounter.hn} | AN: {selectedEncounter.encounterNo}</Text>
                    <Text size="sm">เตียง: {selectedEncounter.bedNumber ?? '-'}</Text>
                    <Text size="sm">วันรับ: {new Date(selectedEncounter.admissionDate).toLocaleDateString('th-TH')}</Text>
                  </Stack>
                  <Badge color={ENC_STATUS_COLOR[selectedEncounter.status]}>
                    {ENC_STATUS_LABEL[selectedEncounter.status]}
                  </Badge>
                </Group>
                {selectedEncounter.status === 2 && (
                  <Group gap="xs" mt="sm">
                    <Button size="sm" variant="outline" onClick={handleOpenTransfer}>ย้ายเตียง</Button>
                    <Button
                      size="sm" color="red" variant="outline"
                      loading={dischargeMutation.isPending}
                      onClick={() => dischargeMutation.mutate(selectedEncounter.encounterId)}
                    >
                      จำหน่ายผู้ป่วย
                    </Button>
                  </Group>
                )}
              </Stack>
            </Paper>
          )}
        </div>
      </div>

      {/* Admit Modal */}
      <Modal opened={admitOpen} onClose={closeAdmit} title="รับผู้ป่วยเข้าหอผู้ป่วย" size="lg">
        <Stack gap="sm">
          <TextInput
            label="ค้นหาผู้ป่วย (HN / ชื่อ)"
            value={patientSearch}
            onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
            placeholder="พิมพ์อย่างน้อย 2 ตัวอักษร"
          />
          {patientResults.length > 0 && !selectedPatient && (
            <Paper withBorder>
              {patientResults.map(p => (
                <div
                  key={p.id}
                  style={{ padding: '8px 12px', cursor: 'pointer' }}
                  onClick={() => { setSelectedPatient(p); setPatientSearch(`${p.preName ?? ''}${p.firstName} ${p.lastName}`); }}
                >
                  <Text size="sm" fw={500}>{(p.preName ?? '') + p.firstName + ' ' + p.lastName}</Text>
                  <Text size="xs" c="dimmed">HN: {p.hn}</Text>
                </div>
              ))}
            </Paper>
          )}
          <Select
            label="หอผู้ป่วย"
            placeholder="เลือก Ward..."
            data={wards.map(w => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
            value={selectedWardId}
            onChange={v => { setSelectedWardId(v); setSelectedBedId(null); }}
          />
          <Select
            label="เตียง"
            placeholder={availableBeds.length === 0 ? 'ไม่มีเตียงว่าง' : 'เลือกเตียง...'}
            data={availableBeds.map(b => ({ value: b.id, label: b.bedNo }))}
            value={selectedBedId}
            onChange={setSelectedBedId}
            disabled={availableBeds.length === 0}
          />
          <Select
            label="แพทย์ผู้รักษา"
            placeholder="เลือกแพทย์..."
            data={doctors.map(d => ({ value: d.id, label: `${d.firstName} ${d.lastName}` }))}
            value={selectedDoctorId}
            onChange={setSelectedDoctorId}
            clearable
          />
          <TextInput
            label="อาการสำคัญ (Chief Complaint)"
            value={chiefComplaint}
            onChange={e => setChiefComplaint(e.target.value)}
            placeholder="ระบุอาการ..."
          />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeAdmit}>ยกเลิก</Button>
            <Button
              color="blue"
              loading={admitMutation.isPending}
              disabled={!selectedPatient || !selectedBedId}
              onClick={() => admitMutation.mutate()}
            >
              รับผู้ป่วย
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Transfer Modal */}
      <Modal opened={transferOpen} onClose={closeTransfer} title="ย้ายเตียง">
        <Stack gap="sm">
          <Text size="sm">เตียงปัจจุบัน: <strong>{selectedEncounter?.bedNumber ?? '-'}</strong></Text>
          <Select
            label="เตียงใหม่"
            placeholder="เลือกเตียงว่าง..."
            data={allAvailableBeds.map(b => ({ value: b.id, label: b.bedNo }))}
            value={newBedId}
            onChange={setNewBedId}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeTransfer}>ยกเลิก</Button>
            <Button
              color="blue"
              loading={transferMutation.isPending}
              disabled={!newBedId}
              onClick={() => selectedEncounter && newBedId && transferMutation.mutate({ encounterId: selectedEncounter.encounterId, bedId: newBedId })}
            >
              ย้ายเตียง
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
