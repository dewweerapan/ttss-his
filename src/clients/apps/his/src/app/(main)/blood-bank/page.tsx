// src/clients/apps/his/src/app/(main)/blood-bank/page.tsx
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
type BloodRequest = {
  id: string; encounterId: string; patientName?: string; hn?: string;
  bloodProduct: number; bloodGroup: string; units: number;
  crossmatchResult?: string; requestedBy?: string;
  status: number; requestDate: string; transfusedAt?: string;
};

const PRODUCT_LABEL: Record<number, string> = {
  1: 'Whole Blood', 2: 'Packed RBC', 3: 'FFP', 4: 'Platelet', 5: 'Cryoprecipitate',
};
const STATUS_LABEL: Record<number, string> = {
  1: 'รออนุมัติ', 2: 'Crossmatch', 3: 'พร้อมส่ง', 4: 'ให้แล้ว', 9: 'ยกเลิก',
};
const STATUS_COLOR: Record<number, string> = {
  1: 'gray', 2: 'orange', 3: 'blue', 4: 'green', 9: 'red',
};
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function BloodBankPage() {
  const qc = useQueryClient();
  const [requestOpen, { open: openRequest, close: closeRequest }] = useDisclosure(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedEnc, setSelectedEnc] = useState<string | null>(null);
  const [bloodProduct, setBloodProduct] = useState<string | null>('2');
  const [bloodGroup, setBloodGroup] = useState<string | null>('O+');
  const [units, setUnits] = useState<number | string>(1);
  const [requestedBy, setRequestedBy] = useState('');

  const { data: requests = [], refetch } = useQuery({
    queryKey: ['blood-requests'],
    queryFn: () => api.get<BloodRequest[]>('/api/blood-requests'),
    refetchInterval: 30000,
  });

  const { data: ipdList = [] } = useQuery({
    queryKey: ['admissions'],
    queryFn: () => api.get<IpdEncounter[]>('/api/admissions'),
    enabled: requestOpen,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/blood-requests', {
      encounterId: selectedEnc,
      bloodProduct: Number(bloodProduct),
      bloodGroup,
      units: Number(units),
      requestedBy: requestedBy || null,
    }),
    onSuccess: () => {
      setSuccessMsg('ส่งคำขอโลหิตสำเร็จ'); setErrorMsg('');
      closeRequest(); qc.invalidateQueries({ queryKey: ['blood-requests'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const crossmatchMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/blood-requests/${id}/crossmatch`, { result: 'Compatible' }),
    onSuccess: () => { setSuccessMsg('บันทึก Crossmatch สำเร็จ'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const readyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/blood-requests/${id}/ready`, {}),
    onSuccess: () => { setSuccessMsg('ทำเครื่องหมายพร้อมส่งแล้ว'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const transfuseMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/blood-requests/${id}/transfuse`, { notes: null, reactionNotes: null }),
    onSuccess: () => { setSuccessMsg('บันทึกการให้โลหิตสำเร็จ'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/blood-requests/${id}/cancel`, {}),
    onSuccess: () => { setSuccessMsg('ยกเลิกคำขอสำเร็จ'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>คลังโลหิต (Blood Bank)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={() => { setSelectedEnc(null); setBloodProduct('2'); setBloodGroup('O+'); setUnits(1); setRequestedBy(''); setErrorMsg(''); openRequest(); }}>
            + ขอโลหิต
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
              <Table.Th>ผลิตภัณฑ์</Table.Th>
              <Table.Th>หมู่โลหิต</Table.Th>
              <Table.Th>จำนวน (unit)</Table.Th>
              <Table.Th>Crossmatch</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {requests.length === 0 ? (
              <Table.Tr><Table.Td colSpan={7}><Text ta="center" c="dimmed">ไม่มีคำขอโลหิต</Text></Table.Td></Table.Tr>
            ) : requests.map(r => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{r.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{r.hn ?? '-'}</Text>
                </Table.Td>
                <Table.Td><Text size="sm">{PRODUCT_LABEL[r.bloodProduct] ?? '-'}</Text></Table.Td>
                <Table.Td><Badge size="sm" variant="outline" color="red">{r.bloodGroup}</Badge></Table.Td>
                <Table.Td><Text size="sm">{r.units}</Text></Table.Td>
                <Table.Td><Text size="sm">{r.crossmatchResult ?? '-'}</Text></Table.Td>
                <Table.Td><Badge size="sm" color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {r.status === 1 && (
                      <Button size="xs" color="orange" variant="outline"
                        loading={crossmatchMutation.isPending}
                        onClick={() => crossmatchMutation.mutate(r.id)}>Crossmatch</Button>
                    )}
                    {r.status === 2 && (
                      <Button size="xs" color="blue" variant="outline"
                        loading={readyMutation.isPending}
                        onClick={() => readyMutation.mutate(r.id)}>พร้อมส่ง</Button>
                    )}
                    {r.status === 3 && (
                      <Button size="xs" color="green" variant="outline"
                        loading={transfuseMutation.isPending}
                        onClick={() => transfuseMutation.mutate(r.id)}>ให้โลหิต</Button>
                    )}
                    {r.status < 4 && (
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

      <Modal opened={requestOpen} onClose={closeRequest} title="ขอโลหิต">
        <Stack gap="sm">
          <Select
            label="ผู้ป่วยใน (IPD)"
            placeholder="เลือกผู้ป่วย..."
            searchable
            data={ipdList.map(e => ({ value: e.encounterId, label: `${e.patientName} (${e.hn})` }))}
            value={selectedEnc}
            onChange={setSelectedEnc}
          />
          <Select label="ผลิตภัณฑ์" data={[
            { value: '1', label: 'Whole Blood' }, { value: '2', label: 'Packed RBC' },
            { value: '3', label: 'FFP' }, { value: '4', label: 'Platelet' }, { value: '5', label: 'Cryoprecipitate' },
          ]} value={bloodProduct} onChange={setBloodProduct} />
          <Group grow>
            <Select label="หมู่โลหิต" data={BLOOD_GROUPS} value={bloodGroup} onChange={setBloodGroup} />
            <NumberInput label="จำนวน (unit)" value={units} onChange={setUnits} min={1} max={99} />
          </Group>
          <TextInput label="ขอโดย" value={requestedBy} onChange={e => setRequestedBy(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeRequest}>ยกเลิก</Button>
            <Button color="red" loading={createMutation.isPending}
              disabled={!selectedEnc || !bloodGroup}
              onClick={() => createMutation.mutate()}>ส่งคำขอ</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
