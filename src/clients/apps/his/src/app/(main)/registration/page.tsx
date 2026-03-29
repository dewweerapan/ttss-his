// src/clients/apps/his/src/app/(main)/registration/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Group, Paper, Stack, Table, Text, TextInput, Textarea, Title,
  Modal, Select, Badge, Alert, Grid,
} from '@mantine/core';
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
type PatientItem = {
  id: string; hn: string; preName?: string; firstName: string; lastName: string;
  gender: number; birthdate?: string; phoneNumber?: string;
};
type PatientListResponse = { items: PatientItem[]; total: number };
type EncounterDetail = {
  id: string; encounterNo: string; status: number;
  queueItem?: { queueNo: string; status: number };
};
type DivisionItem = { id: string; code: string; name: string };
type PatientDetail = { id: string; allergy?: string; allergyNote?: string };

const PRENAME_OPTIONS = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.'].map(v => ({ value: v, label: v }));
const BLOOD_OPTIONS = ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }));

// ── Page ───────────────────────────────────────────────────────────────────
export default function RegistrationPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
  const [divisionId, setDivisionId] = useState<string | null>('div-opd');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [allergyModalOpen, { open: openAllergyModal, close: closeAllergyModal }] = useDisclosure(false);
  const [newPatientOpen, { open: openNewPatient, close: closeNewPatient }] = useDisclosure(false);
  const [allergyInput, setAllergyInput] = useState('');
  const [allergyNoteInput, setAllergyNoteInput] = useState('');
  const qc = useQueryClient();

  // New patient form state
  const [npPreName, setNpPreName] = useState<string | null>(null);
  const [npFirst, setNpFirst] = useState('');
  const [npLast, setNpLast] = useState('');
  const [npGender, setNpGender] = useState<string | null>('1');
  const [npBirthdate, setNpBirthdate] = useState('');
  const [npCitizenNo, setNpCitizenNo] = useState('');
  const [npPhone, setNpPhone] = useState('');
  const [npBlood, setNpBlood] = useState<string | null>(null);

  const { data: patients, isFetching } = useQuery({
    queryKey: ['patients', debouncedSearch],
    queryFn: () =>
      api.get<PatientListResponse>(
        debouncedSearch
          ? `/api/patients?search=${encodeURIComponent(debouncedSearch)}&pageSize=30`
          : `/api/patients?pageSize=30`
      ),
  });

  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => api.get<DivisionItem[]>('/api/masterdata/divisions'),
  });

  const { data: patientDetail } = useQuery({
    queryKey: ['patient-detail', selectedPatient?.id],
    queryFn: () => api.get<PatientDetail>(`/api/patients/${selectedPatient!.id}`),
    enabled: !!selectedPatient,
  });

  const createEncounter = useMutation({
    mutationFn: (body: { patientId: string; divisionId: string; type: number }) =>
      api.post<EncounterDetail>('/api/encounters', body),
    onSuccess: (data) => {
      setSuccessMsg(`สร้าง Visit สำเร็จ: ${data.encounterNo} — คิว ${data.queueItem?.queueNo ?? '-'}`);
      setErrorMsg(''); closeModal(); setSelectedPatient(null);
      qc.invalidateQueries({ queryKey: ['encounters'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const createPatient = useMutation({
    mutationFn: () => api.post<PatientItem>('/api/patients', {
      preName: npPreName,
      firstName: npFirst.trim(),
      lastName: npLast.trim(),
      gender: Number(npGender),
      birthdate: npBirthdate || null,
      citizenNo: npCitizenNo.trim() || null,
      phoneNumber: npPhone.trim() || null,
      bloodGroup: npBlood || null,
    }),
    onSuccess: (data) => {
      setSuccessMsg(`ลงทะเบียนผู้ป่วยใหม่สำเร็จ HN: ${data.hn}`);
      setErrorMsg(''); closeNewPatient();
      setSearch(data.hn);
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const updateAllergy = useMutation({
    mutationFn: () => api.patch(`/api/patients/${selectedPatient!.id}/allergy`, {
      allergy: allergyInput.trim() || null,
      allergyNote: allergyNoteInput.trim() || null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกข้อมูลแพ้ยาแล้ว'); closeAllergyModal();
      qc.invalidateQueries({ queryKey: ['patient-detail', selectedPatient?.id] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const handleSearch = () => { setSearch(search.trim()); setSuccessMsg(''); setErrorMsg(''); };
  const handleCreate = () => { if (!selectedPatient || !divisionId) return; createEncounter.mutate({ patientId: selectedPatient.id, divisionId, type: 1 }); };
  const handleOpenAllergyModal = () => { setAllergyInput(patientDetail?.allergy ?? ''); setAllergyNoteInput(patientDetail?.allergyNote ?? ''); openAllergyModal(); };
  const handleOpenNewPatient = () => { setNpPreName(null); setNpFirst(''); setNpLast(''); setNpGender('1'); setNpBirthdate(''); setNpCitizenNo(''); setNpPhone(''); setNpBlood(null); openNewPatient(); };

  const divOptions = (divisions ?? []).map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }));

  const rows = (patients?.items ?? []).map((p) => (
    <Table.Tr
      key={p.id}
      style={{ cursor: 'pointer', background: selectedPatient?.id === p.id ? '#e8f4fd' : undefined }}
      onClick={() => { setSelectedPatient(p); setSuccessMsg(''); setErrorMsg(''); }}
    >
      <Table.Td>{p.hn}</Table.Td>
      <Table.Td>{(p.preName ?? '') + p.firstName + ' ' + p.lastName}</Table.Td>
      <Table.Td>{p.gender === 1 ? 'ชาย' : 'หญิง'}</Table.Td>
      <Table.Td>{p.birthdate ? new Date(p.birthdate).toLocaleDateString('th-TH') : '-'}</Table.Td>
      <Table.Td>{p.phoneNumber ?? '-'}</Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        <Button size="xs" variant="subtle" onClick={() => router.push(`/patients/${p.id}`)}>ประวัติ</Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ทะเบียนผู้ป่วย (REG)</Title>
        <Button color="green" onClick={handleOpenNewPatient}>+ ลงทะเบียนผู้ป่วยใหม่</Button>
      </Group>

      {successMsg && <Alert color="green" title="สำเร็จ" withCloseButton onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" title="เกิดข้อผิดพลาด" withCloseButton onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}

      <Paper withBorder p="md">
        <Group>
          <TextInput
            placeholder="กรอง HN / ชื่อ / เลขบัตรประชาชน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSearch} loading={isFetching}>ค้นหา</Button>
        </Group>
      </Paper>

      {patients && (
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>HN</Table.Th><Table.Th>ชื่อ-นามสกุล</Table.Th>
                <Table.Th>เพศ</Table.Th><Table.Th>วันเกิด</Table.Th>
                <Table.Th>เบอร์โทร</Table.Th><Table.Th>ประวัติ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่พบข้อมูล</Text></Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {selectedPatient && (
        <Paper withBorder p="md">
          {patientDetail?.allergy && (
            <Alert color="red" title="⚠️ แพ้ยา / แพ้สาร" mb="sm">
              <Text fw={700}>{patientDetail.allergy}</Text>
              {patientDetail.allergyNote && <Text size="sm">{patientDetail.allergyNote}</Text>}
            </Alert>
          )}
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={600}>{(selectedPatient.preName ?? '') + selectedPatient.firstName + ' ' + selectedPatient.lastName}</Text>
              <Group gap="sm">
                <Text size="sm" c="dimmed">HN: {selectedPatient.hn}</Text>
                {patientDetail?.allergy
                  ? <Badge color="red" size="sm">แพ้ยา: {patientDetail.allergy}</Badge>
                  : <Badge color="gray" size="sm" variant="outline">ไม่มีประวัติแพ้ยา</Badge>}
              </Group>
            </Stack>
            <Group gap="xs">
              <Button variant="outline" color="red" size="xs" onClick={handleOpenAllergyModal}>บันทึกแพ้ยา</Button>
              <Button color="blue" onClick={openModal}>สร้าง Visit ใหม่</Button>
            </Group>
          </Group>
        </Paper>
      )}

      {/* Visit modal */}
      <Modal opened={modalOpen} onClose={closeModal} title="สร้าง Visit ใหม่">
        <Stack>
          <Text>ผู้ป่วย: <strong>{(selectedPatient?.preName ?? '') + (selectedPatient?.firstName ?? '') + ' ' + (selectedPatient?.lastName ?? '')}</strong></Text>
          <Text size="sm" c="dimmed">HN: {selectedPatient?.hn}</Text>
          {patientDetail?.allergy && (
            <Alert color="red" title="⚠️ แพ้ยา">
              {patientDetail.allergy}{patientDetail.allergyNote && ` — ${patientDetail.allergyNote}`}
            </Alert>
          )}
          <Select label="แผนก" data={divOptions} value={divisionId} onChange={setDivisionId} required />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>ยกเลิก</Button>
            <Button onClick={handleCreate} loading={createEncounter.isPending} disabled={!divisionId}>ยืนยัน</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Allergy modal */}
      <Modal opened={allergyModalOpen} onClose={closeAllergyModal} title="บันทึกข้อมูลแพ้ยา / แพ้สาร">
        <Stack>
          <TextInput label="ยาหรือสารที่แพ้ (คั่นด้วยจุลภาค)" placeholder="เช่น Penicillin, Sulfa" value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)} />
          <Textarea label="รายละเอียดอาการแพ้" placeholder="เช่น ผื่นลมพิษ หายใจลำบาก" value={allergyNoteInput} onChange={(e) => setAllergyNoteInput(e.target.value)} rows={3} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeAllergyModal}>ยกเลิก</Button>
            <Button color="red" loading={updateAllergy.isPending} onClick={() => updateAllergy.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>

      {/* New patient modal */}
      <Modal opened={newPatientOpen} onClose={closeNewPatient} title="ลงทะเบียนผู้ป่วยใหม่" size="lg">
        <Stack>
          <Grid>
            <Grid.Col span={4}>
              <Select label="คำนำหน้า" data={PRENAME_OPTIONS} value={npPreName} onChange={setNpPreName} clearable />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="ชื่อ" required value={npFirst} onChange={(e) => setNpFirst(e.target.value)} />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="นามสกุล" required value={npLast} onChange={(e) => setNpLast(e.target.value)} />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select label="เพศ" data={[{ value: '1', label: 'ชาย' }, { value: '2', label: 'หญิง' }, { value: '3', label: 'ไม่ระบุ' }]} value={npGender} onChange={setNpGender} />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="วันเกิด" type="date" value={npBirthdate} onChange={(e) => setNpBirthdate(e.target.value)} />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select label="กรุ๊ปเลือด" data={BLOOD_OPTIONS} value={npBlood} onChange={setNpBlood} clearable />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="เลขบัตรประชาชน" placeholder="13 หลัก" value={npCitizenNo} onChange={(e) => setNpCitizenNo(e.target.value)} maxLength={13} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="เบอร์โทรศัพท์" placeholder="0812345678" value={npPhone} onChange={(e) => setNpPhone(e.target.value)} />
            </Grid.Col>
          </Grid>
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={closeNewPatient}>ยกเลิก</Button>
            <Button color="green" loading={createPatient.isPending} disabled={!npFirst.trim() || !npLast.trim()} onClick={() => createPatient.mutate()}>
              ลงทะเบียน
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
