// src/clients/apps/his/src/app/(main)/referring/page.tsx — AGN Referring Hospital
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select, Stack,
  Table, Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Patient = { id: string; hn: string; firstName: string; lastName: string; preName?: string };
type ReferralRecord = {
  id: string; direction: string; patientName: string; hn: string;
  hospital: string; reason: string; doctorName?: string; status: string;
  referDate: string; notes?: string;
};

// Simple local storage management for referrals
function loadReferrals(): ReferralRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('referral_records') ?? '[]'); }
  catch { return []; }
}
function saveReferrals(records: ReferralRecord[]) {
  if (typeof window !== 'undefined') localStorage.setItem('referral_records', JSON.stringify(records));
}

export default function ReferringPage() {
  const [createOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [records, setRecords] = useState<ReferralRecord[]>(loadReferrals);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [direction, setDirection] = useState<string | null>('OUT');
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedPatientSearch] = useDebouncedValue(patientSearch, 300);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [hospital, setHospital] = useState('');
  const [reason, setReason] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');

  const { data: patientResults = [] } = useQuery({
    queryKey: ['patients', 'search', debouncedPatientSearch],
    queryFn: () => api.get<Patient[]>(
      debouncedPatientSearch
        ? `/api/patients?search=${encodeURIComponent(debouncedPatientSearch)}&pageSize=20`
        : `/api/patients?pageSize=20`
    ),
  });

  const handleCreate = () => {
    if (!selectedPatient || !hospital || !reason) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วน'); return;
    }
    const newRecord: ReferralRecord = {
      id: crypto.randomUUID(),
      direction: direction ?? 'OUT',
      patientName: (selectedPatient.preName ?? '') + selectedPatient.firstName + ' ' + selectedPatient.lastName,
      hn: selectedPatient.hn,
      hospital, reason, doctorName: doctorName || undefined,
      status: 'ส่งแล้ว',
      referDate: new Date().toISOString(),
      notes: notes || undefined,
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    saveReferrals(updated);
    setSuccessMsg('บันทึกการส่งต่อสำเร็จ');
    closeCreate();
    setSelectedPatient(null); setPatientSearch(''); setHospital(''); setReason(''); setDoctorName(''); setNotes('');
  };

  const outCount = records.filter(r => r.direction === 'OUT').length;
  const inCount  = records.filter(r => r.direction === 'IN').length;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>การส่งต่อผู้ป่วย (Referring)</Title>
        <Group gap="xs">
          <Badge color="blue" variant="light">ส่งออก {outCount}</Badge>
          <Badge color="green" variant="light">รับเข้า {inCount}</Badge>
          <Button size="sm" onClick={() => {
            setDirection('OUT'); setSelectedPatient(null); setPatientSearch('');
            setHospital(''); setReason(''); setDoctorName(''); setNotes('');
            setErrorMsg(''); openCreate();
          }}>+ ส่งต่อ</Button>
        </Group>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ทิศทาง</Table.Th>
              <Table.Th>ผู้ป่วย</Table.Th>
              <Table.Th>โรงพยาบาล</Table.Th>
              <Table.Th>สาเหตุการส่งต่อ</Table.Th>
              <Table.Th>แพทย์</Table.Th>
              <Table.Th>วันที่</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {records.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีบันทึกการส่งต่อ</Text></Table.Td></Table.Tr>
            ) : records.map(r => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Badge color={r.direction === 'OUT' ? 'orange' : 'green'} size="sm">
                    {r.direction === 'OUT' ? 'ส่งออก' : 'รับเข้า'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{r.patientName}</Text>
                  <Text size="xs" c="dimmed">{r.hn}</Text>
                </Table.Td>
                <Table.Td><Text size="sm">{r.hospital}</Text></Table.Td>
                <Table.Td><Text size="sm" lineClamp={2}>{r.reason}</Text></Table.Td>
                <Table.Td><Text size="sm">{r.doctorName ?? '-'}</Text></Table.Td>
                <Table.Td><Text size="xs">{new Date(r.referDate).toLocaleDateString('th-TH')}</Text></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createOpen} onClose={closeCreate} title="บันทึกการส่งต่อผู้ป่วย" size="lg">
        <Stack gap="sm">
          <Select label="ทิศทาง" data={[
            { value: 'OUT', label: 'ส่งออก (Refer Out)' },
            { value: 'IN',  label: 'รับเข้า (Refer In)' },
          ]} value={direction} onChange={setDirection} />
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
          <TextInput label="โรงพยาบาลปลายทาง/ต้นทาง" value={hospital}
            onChange={e => setHospital(e.target.value)} placeholder="เช่น โรงพยาบาลรามาธิบดี" required />
          <Textarea label="สาเหตุ/เหตุผลการส่งต่อ" rows={3} value={reason} onChange={e => setReason(e.target.value)} required />
          <TextInput label="แพทย์ผู้ส่งต่อ" value={doctorName} onChange={e => setDoctorName(e.target.value)} />
          <Textarea label="หมายเหตุ" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCreate}>ยกเลิก</Button>
            <Button color="blue" disabled={!selectedPatient || !hospital || !reason} onClick={handleCreate}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
