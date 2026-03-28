// src/clients/apps/his/src/app/(main)/infection-control/page.tsx
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
type HaiRecord = {
  id: string; patientName?: string; hn?: string; encounterId: string;
  infectionType: string; organism?: string; ward?: string;
  reportedBy?: string; reportDate: string; status: number; notes?: string;
};

const HAI_TYPES = ['CAUTI', 'CLABSI', 'VAP', 'SSI', 'C.diff', 'MRSA', 'VRE', 'CRE', 'Other'];

// Simple in-memory store pattern using localStorage
function loadRecords(): HaiRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('hai_records') ?? '[]'); }
  catch { return []; }
}
function saveRecords(records: HaiRecord[]) {
  if (typeof window !== 'undefined') localStorage.setItem('hai_records', JSON.stringify(records));
}

export default function InfectionControlPage() {
  const [createOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [records, setRecords] = useState<HaiRecord[]>(loadRecords);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [infType, setInfType] = useState<string | null>('CAUTI');
  const [organism, setOrganism] = useState('');
  const [ward, setWard] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [notes, setNotes] = useState('');

  const { data: ipdList = [] } = useQuery({
    queryKey: ['admissions'],
    queryFn: () => api.get<IpdEncounter[]>('/api/admissions'),
    enabled: createOpen,
  });

  const handleCreate = () => {
    if (!encounterId || !infType) { setErrorMsg('กรุณาเลือกผู้ป่วยและประเภทการติดเชื้อ'); return; }
    const enc = ipdList.find(e => e.encounterId === encounterId);
    const newRecord: HaiRecord = {
      id: crypto.randomUUID(), encounterId,
      patientName: enc?.patientName, hn: enc?.hn,
      infectionType: infType, organism: organism || undefined,
      ward: ward || undefined, reportedBy: reportedBy || undefined,
      reportDate: new Date().toISOString(), status: 1,
      notes: notes || undefined,
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    saveRecords(updated);
    setSuccessMsg('บันทึกรายงาน HAI สำเร็จ');
    closeCreate();
    setEncounterId(null); setOrganism(''); setWard(''); setReportedBy(''); setNotes('');
  };

  const handleDelete = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    saveRecords(updated);
    setSuccessMsg('ลบรายงานแล้ว');
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ควบคุมการติดเชื้อ (Infection Control)</Title>
        <Button size="sm" onClick={() => { setEncounterId(null); setInfType('CAUTI'); setOrganism(''); setWard(''); setReportedBy(''); setNotes(''); setErrorMsg(''); openCreate(); }}>
          + รายงาน HAI
        </Button>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Alert color="orange">
        ข้อมูล HAI บันทึกในระบบชั่วคราว (localStorage) — ระบบเต็มรูปแบบต้องต่อกับ database
      </Alert>

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ผู้ป่วย</Table.Th>
              <Table.Th>ประเภทการติดเชื้อ</Table.Th>
              <Table.Th>เชื้อที่พบ</Table.Th>
              <Table.Th>Ward</Table.Th>
              <Table.Th>วันที่รายงาน</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {records.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีรายงาน HAI</Text></Table.Td></Table.Tr>
            ) : records.map(r => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{r.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{r.hn ?? '-'}</Text>
                </Table.Td>
                <Table.Td><Badge size="sm" color="red">{r.infectionType}</Badge></Table.Td>
                <Table.Td><Text size="sm">{r.organism ?? '-'}</Text></Table.Td>
                <Table.Td><Text size="sm">{r.ward ?? '-'}</Text></Table.Td>
                <Table.Td><Text size="xs">{new Date(r.reportDate).toLocaleDateString('th-TH')}</Text></Table.Td>
                <Table.Td>
                  <Button size="xs" color="red" variant="subtle" onClick={() => handleDelete(r.id)}>ลบ</Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createOpen} onClose={closeCreate} title="รายงานการติดเชื้อ (HAI)">
        <Stack gap="sm">
          <Select label="ผู้ป่วยใน (IPD)" placeholder="เลือกผู้ป่วย..." searchable
            data={ipdList.map(e => ({ value: e.encounterId, label: `${e.patientName} (${e.hn})` }))}
            value={encounterId} onChange={setEncounterId} />
          <Select label="ประเภทการติดเชื้อ" data={HAI_TYPES} value={infType} onChange={setInfType} />
          <TextInput label="เชื้อที่พบ (ถ้าทราบ)" value={organism} onChange={e => setOrganism(e.target.value)} placeholder="เช่น MRSA, E.coli" />
          <TextInput label="Ward / หน่วยงาน" value={ward} onChange={e => setWard(e.target.value)} />
          <TextInput label="รายงานโดย" value={reportedBy} onChange={e => setReportedBy(e.target.value)} />
          <Textarea label="หมายเหตุ" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreate}>ยกเลิก</Button>
            <Button color="red" onClick={handleCreate}>รายงาน</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
