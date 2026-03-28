// src/clients/apps/his/src/app/(main)/pathology/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select, Stack,
  Table, Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Encounter = { encounterId: string; encounterNo: string; hn: string; patientName: string };
type PathologyOrder = {
  id: string; encounterId: string; patientName?: string; hn?: string;
  specimenType: number; specimenSite: string; clinicalInfo?: string; orderedBy?: string;
  status: number; orderDate: string; receivedAt?: string; reportedAt?: string;
  macroscopicFindings?: string; microscopicFindings?: string;
  diagnosis?: string; pathologistName?: string;
};

const SPECIMEN_LABEL: Record<number, string> = {
  1: 'Biopsy', 2: 'Histology', 3: 'Cytology', 4: 'Frozen Section', 5: 'Autopsy', 9: 'Other',
};
const STATUS_LABEL: Record<number, string> = {
  1: 'รอส่งตรวจ', 2: 'รับชิ้นเนื้อ', 3: 'กำลังประมวลผล', 4: 'รายงานแล้ว', 9: 'ยกเลิก',
};
const STATUS_COLOR: Record<number, string> = {
  1: 'gray', 2: 'blue', 3: 'orange', 4: 'green', 9: 'red',
};

export default function PathologyPage() {
  const qc = useQueryClient();
  const [orderOpen, { open: openOrder, close: closeOrder }] = useDisclosure(false);
  const [reportOpen, { open: openReport, close: closeReport }] = useDisclosure(false);
  const [viewOpen, { open: openView, close: closeView }] = useDisclosure(false);
  const [selected, setSelected] = useState<PathologyOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedEnc, setSelectedEnc] = useState<string | null>(null);
  const [specimenType, setSpecimenType] = useState<string | null>('1');
  const [specimenSite, setSpecimenSite] = useState('');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [orderedBy, setOrderedBy] = useState('');
  const [macroFindings, setMacroFindings] = useState('');
  const [microFindings, setMicroFindings] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [pathologist, setPathologist] = useState('');

  const { data: orders = [], refetch } = useQuery({
    queryKey: ['pathology-orders'],
    queryFn: () => api.get<PathologyOrder[]>('/api/pathology-orders'),
    refetchInterval: 60000,
  });

  const { data: encounters = [] } = useQuery({
    queryKey: ['active-encounters-all'],
    queryFn: () => api.get<Encounter[]>('/api/admissions'),
    enabled: orderOpen,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/api/pathology-orders', {
      encounterId: selectedEnc, specimenType: Number(specimenType),
      specimenSite, clinicalInfo: clinicalInfo || null, orderedBy: orderedBy || null,
    }),
    onSuccess: () => {
      setSuccessMsg('ส่งตรวจชิ้นเนื้อสำเร็จ'); setErrorMsg('');
      closeOrder(); qc.invalidateQueries({ queryKey: ['pathology-orders'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/pathology-orders/${id}/receive`, {}),
    onSuccess: () => { setSuccessMsg('รับชิ้นเนื้อแล้ว'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const reportMutation = useMutation({
    mutationFn: () => api.patch(`/api/pathology-orders/${selected!.id}/report`, {
      macroscopicFindings: macroFindings || null,
      microscopicFindings: microFindings || null,
      diagnosis: diagnosis || null,
      pathologistName: pathologist || null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกรายงานพยาธิวิทยาสำเร็จ'); setErrorMsg('');
      closeReport(); refetch();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/pathology-orders/${id}/cancel`, {}),
    onSuccess: () => { setSuccessMsg('ยกเลิกแล้ว'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>พยาธิวิทยา (Pathology)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={() => {
            setSelectedEnc(null); setSpecimenType('1'); setSpecimenSite('');
            setClinicalInfo(''); setOrderedBy(''); setErrorMsg(''); openOrder();
          }}>+ ส่งชิ้นเนื้อ</Button>
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
              <Table.Th>ตำแหน่งชิ้นเนื้อ</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>วันที่</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orders.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีคำสั่งส่งตรวจ</Text></Table.Td></Table.Tr>
            ) : orders.map(o => (
              <Table.Tr key={o.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{o.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{o.hn ?? '-'}</Text>
                </Table.Td>
                <Table.Td><Badge size="sm" variant="light">{SPECIMEN_LABEL[o.specimenType] ?? '-'}</Badge></Table.Td>
                <Table.Td><Text size="sm">{o.specimenSite}</Text></Table.Td>
                <Table.Td><Badge size="sm" color={STATUS_COLOR[o.status]}>{STATUS_LABEL[o.status]}</Badge></Table.Td>
                <Table.Td><Text size="xs">{new Date(o.orderDate).toLocaleDateString('th-TH')}</Text></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {o.status === 4 && (
                      <Button size="xs" variant="light" onClick={() => { setSelected(o); openView(); }}>ดูรายงาน</Button>
                    )}
                    {o.status === 1 && (
                      <Button size="xs" color="blue" variant="outline"
                        loading={receiveMutation.isPending}
                        onClick={() => receiveMutation.mutate(o.id)}>รับชิ้นเนื้อ</Button>
                    )}
                    {(o.status === 2 || o.status === 3) && (
                      <Button size="xs" color="green" variant="outline"
                        onClick={() => { setSelected(o); setMacroFindings(''); setMicroFindings(''); setDiagnosis(''); setPathologist(''); openReport(); }}>
                        รายงาน
                      </Button>
                    )}
                    {o.status < 4 && (
                      <Button size="xs" color="red" variant="subtle"
                        loading={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(o.id)}>ยกเลิก</Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={orderOpen} onClose={closeOrder} title="ส่งตรวจชิ้นเนื้อ">
        <Stack gap="sm">
          <Select label="ผู้ป่วย" placeholder="เลือกผู้ป่วย..." searchable
            data={encounters.map(e => ({ value: e.encounterId, label: `${e.patientName} (${e.hn})` }))}
            value={selectedEnc} onChange={setSelectedEnc} />
          <Select label="ประเภทชิ้นเนื้อ" data={[
            { value: '1', label: 'Biopsy' }, { value: '2', label: 'Histology' },
            { value: '3', label: 'Cytology' }, { value: '4', label: 'Frozen Section' },
            { value: '5', label: 'Autopsy' }, { value: '9', label: 'Other' },
          ]} value={specimenType} onChange={setSpecimenType} />
          <TextInput label="ตำแหน่งชิ้นเนื้อ" value={specimenSite} onChange={e => setSpecimenSite(e.target.value)} required />
          <Textarea label="ข้อมูลทางคลินิก" rows={2} value={clinicalInfo} onChange={e => setClinicalInfo(e.target.value)} />
          <TextInput label="แพทย์ผู้ส่ง" value={orderedBy} onChange={e => setOrderedBy(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeOrder}>ยกเลิก</Button>
            <Button color="blue" loading={createMutation.isPending}
              disabled={!selectedEnc || !specimenSite} onClick={() => createMutation.mutate()}>ส่งตรวจ</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={reportOpen} onClose={closeReport} title="รายงานพยาธิวิทยา" size="lg">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">ชิ้นเนื้อ: <strong>{selected?.specimenSite}</strong></Text>
          <Textarea label="Macroscopic Findings" rows={3} value={macroFindings} onChange={e => setMacroFindings(e.target.value)} />
          <Textarea label="Microscopic Findings" rows={4} value={microFindings} onChange={e => setMicroFindings(e.target.value)} />
          <TextInput label="Diagnosis / Impression" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
          <TextInput label="พยาธิแพทย์" value={pathologist} onChange={e => setPathologist(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeReport}>ยกเลิก</Button>
            <Button color="green" loading={reportMutation.isPending}
              disabled={!diagnosis} onClick={() => reportMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={viewOpen} onClose={closeView} title="รายงานพยาธิวิทยา" size="lg">
        {selected && (
          <Stack gap="sm">
            <Group>
              <Badge>{SPECIMEN_LABEL[selected.specimenType]}</Badge>
              <Text fw={600}>{selected.specimenSite}</Text>
            </Group>
            <Text size="sm" c="dimmed">ผู้ป่วย: {selected.patientName} | {selected.hn}</Text>
            {selected.macroscopicFindings && <>
              <Text size="sm"><strong>Macroscopic:</strong></Text>
              <Paper withBorder p="sm"><Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selected.macroscopicFindings}</Text></Paper>
            </>}
            {selected.microscopicFindings && <>
              <Text size="sm"><strong>Microscopic:</strong></Text>
              <Paper withBorder p="sm"><Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selected.microscopicFindings}</Text></Paper>
            </>}
            <Text size="sm"><strong>Diagnosis:</strong> {selected.diagnosis ?? '-'}</Text>
            {selected.pathologistName && <Text size="sm" c="dimmed">พยาธิแพทย์: {selected.pathologistName}</Text>}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
