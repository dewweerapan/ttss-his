// src/clients/apps/his/src/app/(main)/er/page.tsx
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
type ErEncounter = {
  encounterId: string; encounterNo: string; hn: string; patientName: string;
  severity: number; arrivalMode: number; triageNotes?: string;
  status: number; admissionDate: string; disposition?: number;
};

const SEVERITY_LABEL: Record<number, string> = { 1: 'P1 — วิกฤต', 2: 'P2 — เร่งด่วน', 3: 'P3 — รึบด่วน', 4: 'P4 — ไม่เร่งด่วน' };
const SEVERITY_COLOR: Record<number, string> = { 1: 'red', 2: 'orange', 3: 'yellow', 4: 'green' };
const ARRIVAL_LABEL: Record<number, string> = { 1: 'เดินเข้า', 2: 'รถพยาบาล', 3: 'รับส่งต่อ', 9: 'อื่นๆ' };
const DISP_LABEL: Record<number, string> = { 1: 'จำหน่าย', 2: 'รับไว้ IPD', 3: 'ส่งต่อ', 9: 'เสียชีวิต' };
const STATUS_COLOR: Record<number, string> = { 1: 'blue', 2: 'orange', 3: 'green' };

export default function ErPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ErEncounter | null>(null);
  const [registerOpen, { open: openRegister, close: closeRegister }] = useDisclosure(false);
  const [triageOpen, { open: openTriage, close: closeTriage }] = useDisclosure(false);
  const [dispOpen, { open: openDisp, close: closeDisp }] = useDisclosure(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Register form
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [severity, setSeverity] = useState<string | null>('3');
  const [arrivalMode, setArrivalMode] = useState<string | null>('1');
  const [triageNotes, setTriageNotes] = useState('');

  // Triage update form
  const [editSeverity, setEditSeverity] = useState<string | null>('3');
  const [editTriageNotes, setEditTriageNotes] = useState('');

  // Disposition form
  const [disposition, setDisposition] = useState<string | null>('1');

  const { data: encounters = [], refetch } = useQuery({
    queryKey: ['er-encounters'],
    queryFn: () => api.get<ErEncounter[]>('/api/er/encounters'),
    refetchInterval: 20000,
  });

  const { data: patientResults = [] } = useQuery({
    queryKey: ['patients', 'search', patientSearch],
    queryFn: () => api.get<{ items: Patient[] }>(`/api/patients?search=${encodeURIComponent(patientSearch)}`).then(r => r.items ?? []),
    enabled: patientSearch.length >= 2,
  });

  const registerMutation = useMutation({
    mutationFn: () => api.post('/api/er/encounters', {
      patientId: selectedPatient?.id,
      chiefComplaint, severity: Number(severity),
      arrivalMode: Number(arrivalMode), triageNotes: triageNotes || null, triageBy: null,
    }),
    onSuccess: () => {
      setSuccessMsg('ลงทะเบียน ER สำเร็จ'); setErrorMsg(''); closeRegister();
      qc.invalidateQueries({ queryKey: ['er-encounters'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const triageMutation = useMutation({
    mutationFn: () => api.patch(`/api/er/encounters/${selected!.encounterId}/triage`, {
      severity: Number(editSeverity), triageNotes: editTriageNotes || null, triageBy: null,
    }),
    onSuccess: () => {
      setSuccessMsg('อัปเดต triage สำเร็จ'); setErrorMsg(''); closeTriage();
      qc.invalidateQueries({ queryKey: ['er-encounters'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const dispMutation = useMutation({
    mutationFn: () => api.patch(`/api/er/encounters/${selected!.encounterId}/disposition`, { disposition: Number(disposition) }),
    onSuccess: () => {
      setSuccessMsg('บันทึก disposition สำเร็จ'); setErrorMsg(''); closeDisp(); setSelected(null);
      qc.invalidateQueries({ queryKey: ['er-encounters'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const openRegisterModal = () => {
    setSelectedPatient(null); setPatientSearch(''); setChiefComplaint('');
    setSeverity('3'); setArrivalMode('1'); setTriageNotes(''); setErrorMsg('');
    openRegister();
  };

  const openTriageModal = (enc: ErEncounter) => {
    setSelected(enc); setEditSeverity(String(enc.severity));
    setEditTriageNotes(enc.triageNotes ?? ''); setErrorMsg(''); openTriage();
  };

  const openDispModal = (enc: ErEncounter) => {
    setSelected(enc); setDisposition('1'); setErrorMsg(''); openDisp();
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ห้องฉุกเฉิน (Emergency Room)</Title>
        <Group gap="xs">
          <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
          <Button size="sm" onClick={openRegisterModal}>+ ลงทะเบียน ER</Button>
        </Group>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ระดับ</Table.Th>
              <Table.Th>ผู้ป่วย</Table.Th>
              <Table.Th>EN</Table.Th>
              <Table.Th>มาถึง</Table.Th>
              <Table.Th>เวลา</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {encounters.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีผู้ป่วยฉุกเฉิน</Text></Table.Td></Table.Tr>
            ) : encounters.map(enc => (
              <Table.Tr key={enc.encounterId}>
                <Table.Td>
                  <Badge color={SEVERITY_COLOR[enc.severity]} size="sm">
                    {SEVERITY_LABEL[enc.severity]}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{enc.patientName}</Text>
                  <Text size="xs" c="dimmed">{enc.hn}</Text>
                </Table.Td>
                <Table.Td><Text size="sm">{enc.encounterNo}</Text></Table.Td>
                <Table.Td><Text size="sm">{ARRIVAL_LABEL[enc.arrivalMode]}</Text></Table.Td>
                <Table.Td><Text size="xs">{new Date(enc.admissionDate).toLocaleTimeString('th-TH')}</Text></Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {!enc.disposition && (
                      <>
                        <Button size="xs" variant="outline" onClick={() => openTriageModal(enc)}>Triage</Button>
                        <Button size="xs" color="teal" onClick={() => openDispModal(enc)}>Disposition</Button>
                      </>
                    )}
                    {enc.disposition && (
                      <Badge color="gray" size="sm">{DISP_LABEL[enc.disposition]}</Badge>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Register Modal */}
      <Modal opened={registerOpen} onClose={closeRegister} title="ลงทะเบียนผู้ป่วยฉุกเฉิน" size="lg">
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
          <TextInput label="อาการสำคัญ" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} placeholder="ระบุอาการ..." />
          <Select label="ระดับความเร่งด่วน" value={severity} onChange={setSeverity}
            data={[{ value:'1',label:'P1 — วิกฤต' },{ value:'2',label:'P2 — เร่งด่วน' },{ value:'3',label:'P3 — รีบด่วน' },{ value:'4',label:'P4 — ไม่เร่งด่วน' }]} />
          <Select label="วิธีมาถึง" value={arrivalMode} onChange={setArrivalMode}
            data={[{ value:'1',label:'เดินเข้า' },{ value:'2',label:'รถพยาบาล' },{ value:'3',label:'รับส่งต่อ' },{ value:'9',label:'อื่นๆ' }]} />
          <Textarea label="หมายเหตุ triage" value={triageNotes} onChange={e => setTriageNotes(e.target.value)} rows={3} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeRegister}>ยกเลิก</Button>
            <Button color="red" loading={registerMutation.isPending} disabled={!selectedPatient} onClick={() => registerMutation.mutate()}>ลงทะเบียน ER</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Triage Update Modal */}
      <Modal opened={triageOpen} onClose={closeTriage} title="อัปเดต Triage">
        <Stack gap="sm">
          <Select label="ระดับความเร่งด่วน" value={editSeverity} onChange={setEditSeverity}
            data={[{ value:'1',label:'P1 — วิกฤต' },{ value:'2',label:'P2 — เร่งด่วน' },{ value:'3',label:'P3 — รีบด่วน' },{ value:'4',label:'P4 — ไม่เร่งด่วน' }]} />
          <Textarea label="หมายเหตุ" value={editTriageNotes} onChange={e => setEditTriageNotes(e.target.value)} rows={3} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeTriage}>ยกเลิก</Button>
            <Button loading={triageMutation.isPending} onClick={() => triageMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Disposition Modal */}
      <Modal opened={dispOpen} onClose={closeDisp} title="Disposition">
        <Stack gap="sm">
          <Select label="การส่งต่อ" value={disposition} onChange={setDisposition}
            data={[{ value:'1',label:'จำหน่ายกลับบ้าน' },{ value:'2',label:'รับไว้ IPD' },{ value:'3',label:'ส่งต่อโรงพยาบาล' },{ value:'9',label:'เสียชีวิต' }]} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDisp}>ยกเลิก</Button>
            <Button color="teal" loading={dispMutation.isPending} onClick={() => dispMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
