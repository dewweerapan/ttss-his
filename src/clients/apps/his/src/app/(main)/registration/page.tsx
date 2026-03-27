// src/clients/apps/his/src/app/(main)/registration/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Group, Paper, Stack, Table, Text, TextInput, Title,
  Modal, Select, Badge, Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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

// ── Page ───────────────────────────────────────────────────────────────────
export default function RegistrationPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
  const [divisionId, setDivisionId] = useState<string | null>('div-opd');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);
  const qc = useQueryClient();

  const { data: patients, isFetching } = useQuery({
    queryKey: ['patients', submittedSearch],
    queryFn: () =>
      api.get<PatientListResponse>(
        `/api/patients?search=${encodeURIComponent(submittedSearch)}&pageSize=30`
      ),
    enabled: submittedSearch.length >= 2,
  });

  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => api.get<DivisionItem[]>('/api/masterdata/divisions'),
  });

  const createEncounter = useMutation({
    mutationFn: (body: { patientId: string; divisionId: string; type: number }) =>
      api.post<EncounterDetail>('/api/encounters', body),
    onSuccess: (data) => {
      setSuccessMsg(
        `สร้าง Visit สำเร็จ: ${data.encounterNo} — คิว ${data.queueItem?.queueNo ?? '-'}`
      );
      setErrorMsg('');
      closeModal();
      setSelectedPatient(null);
      qc.invalidateQueries({ queryKey: ['encounters'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const handleSearch = () => {
    setSubmittedSearch(search.trim());
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleCreate = () => {
    if (!selectedPatient || !divisionId) return;
    createEncounter.mutate({
      patientId: selectedPatient.id,
      divisionId,
      type: 1,
    });
  };

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
      <Table.Td>{p.birthdate ?? '-'}</Table.Td>
      <Table.Td>{p.phoneNumber ?? '-'}</Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        <Button size="xs" variant="subtle" onClick={() => router.push(`/patients/${p.id}`)}>ประวัติ</Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Title order={3}>ทะเบียนผู้ป่วย (REG)</Title>

      {successMsg && <Alert color="green" title="สำเร็จ">{successMsg}</Alert>}
      {errorMsg && <Alert color="red" title="เกิดข้อผิดพลาด">{errorMsg}</Alert>}

      <Paper withBorder p="md">
        <Group>
          <TextInput
            placeholder="ค้นหา HN / ชื่อ / เลขบัตรประชาชน"
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
                <Table.Th>HN</Table.Th>
                <Table.Th>ชื่อ-นามสกุล</Table.Th>
                <Table.Th>เพศ</Table.Th>
                <Table.Th>วันเกิด</Table.Th>
                <Table.Th>เบอร์โทร</Table.Th>
                <Table.Th>ประวัติ</Table.Th>
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
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={600}>
                {(selectedPatient.preName ?? '') + selectedPatient.firstName + ' ' + selectedPatient.lastName}
              </Text>
              <Text size="sm" c="dimmed">HN: {selectedPatient.hn}</Text>
            </Stack>
            <Button color="blue" onClick={openModal}>สร้าง Visit ใหม่</Button>
          </Group>
        </Paper>
      )}

      <Modal opened={modalOpen} onClose={closeModal} title="สร้าง Visit ใหม่">
        <Stack>
          <Text>ผู้ป่วย: <strong>{(selectedPatient?.preName ?? '') + (selectedPatient?.firstName ?? '') + ' ' + (selectedPatient?.lastName ?? '')}</strong></Text>
          <Text>HN: {selectedPatient?.hn}</Text>
          <Select
            label="แผนก"
            data={divOptions}
            value={divisionId}
            onChange={setDivisionId}
            required
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>ยกเลิก</Button>
            <Button
              onClick={handleCreate}
              loading={createEncounter.isPending}
              disabled={!divisionId}
            >
              ยืนยัน
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
