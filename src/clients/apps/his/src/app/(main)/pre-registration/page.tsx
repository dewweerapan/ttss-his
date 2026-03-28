// src/clients/apps/his/src/app/(main)/pre-registration/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select, Stack, Table,
  Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type PreRegForm = {
  firstName: string;
  lastName: string;
  preName: string;
  citizenNo: string;
  phone: string;
  dateOfBirth: string;
  chiefComplaint: string;
  preferredDate: string;
  preferredTime: string;
  visitType: string;
  notes: string;
};

type PreRegRecord = PreRegForm & {
  id: string;
  submittedAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
};

const VISIT_TYPE_LABEL: Record<string, string> = {
  opd: 'OPD ทั่วไป',
  specialist: 'แพทย์เฉพาะทาง',
  dental: 'ทันตกรรม',
  lab: 'ตรวจแลบ',
  imaging: 'รังสีวิทยา',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'yellow',
  confirmed: 'green',
  cancelled: 'red',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  cancelled: 'ยกเลิก',
};

const STORAGE_KEY = 'his_pre_registrations';

function loadRecords(): PreRegRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}
function saveRecords(r: PreRegRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}

const EMPTY_FORM: PreRegForm = {
  firstName: '', lastName: '', preName: 'นาย', citizenNo: '', phone: '',
  dateOfBirth: '', chiefComplaint: '', preferredDate: '', preferredTime: '08:00',
  visitType: 'opd', notes: '',
};

export default function PreRegistrationPage() {
  const [records, setRecords] = useState<PreRegRecord[]>(loadRecords);
  const [form, setForm] = useState<PreRegForm>(EMPTY_FORM);
  const [opened, { open, close }] = useDisclosure(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const f = (field: keyof PreRegForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.preferredDate) {
      setErrorMsg('กรุณากรอกข้อมูลที่จำเป็น');
      return;
    }
    const newRecord: PreRegRecord = {
      ...form,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    const updated = [newRecord, ...records];
    saveRecords(updated);
    setRecords(updated);
    setSuccessMsg('ลงทะเบียนล่วงหน้าสำเร็จ');
    setErrorMsg('');
    close();
    setForm(EMPTY_FORM);
  };

  const handleConfirm = (id: string) => {
    const updated = records.map(r => r.id === id ? { ...r, status: 'confirmed' as const } : r);
    saveRecords(updated);
    setRecords(updated);
  };

  const handleCancel = (id: string) => {
    const updated = records.map(r => r.id === id ? { ...r, status: 'cancelled' as const } : r);
    saveRecords(updated);
    setRecords(updated);
  };

  const pendingCount = records.filter(r => r.status === 'pending').length;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Pre-Registration / Self Check-in (PRP)</Title>
        <Group gap="xs">
          {pendingCount > 0 && <Badge color="yellow" size="lg">{pendingCount} รอยืนยัน</Badge>}
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setErrorMsg(''); open(); }}>
            + ลงทะเบียนล่วงหน้า
          </Button>
        </Group>
      </Group>

      <Alert color="blue" title="หมายเหตุ">
        ข้อมูลนี้บันทึกในเครื่องเพื่อการสาธิต ในระบบจริงจะเชื่อมต่อกับระบบนัดหมายและการลงทะเบียนผู้ป่วย
      </Alert>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ชื่อ-นามสกุล</Table.Th>
              <Table.Th>ประเภท</Table.Th>
              <Table.Th>วันที่นัด</Table.Th>
              <Table.Th>อาการ</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {records.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed">ยังไม่มีการลงทะเบียนล่วงหน้า</Text>
                </Table.Td>
              </Table.Tr>
            ) : records.map(r => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{r.preName}{r.firstName} {r.lastName}</Text>
                  <Text size="xs" c="dimmed">{r.phone}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light">{VISIT_TYPE_LABEL[r.visitType] ?? r.visitType}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{r.preferredDate}</Text>
                  <Text size="xs" c="dimmed">{r.preferredTime}</Text>
                </Table.Td>
                <Table.Td><Text size="sm">{r.chiefComplaint || '-'}</Text></Table.Td>
                <Table.Td>
                  <Badge size="sm" color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {r.status === 'pending' && (
                      <>
                        <Button size="xs" color="green" variant="outline" onClick={() => handleConfirm(r.id)}>
                          ยืนยัน
                        </Button>
                        <Button size="xs" color="red" variant="subtle" onClick={() => handleCancel(r.id)}>
                          ยกเลิก
                        </Button>
                      </>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={opened} onClose={close} title="ลงทะเบียนล่วงหน้า" size="lg">
        <Stack gap="sm">
          <Group grow>
            <Select label="คำนำหน้า" data={['นาย', 'นาง', 'นางสาว', 'ด.ช.', 'ด.ญ.']}
              value={form.preName} onChange={v => setForm(p => ({ ...p, preName: v ?? 'นาย' }))} />
            <TextInput label="ชื่อ *" value={form.firstName} onChange={f('firstName')} required />
            <TextInput label="นามสกุล *" value={form.lastName} onChange={f('lastName')} required />
          </Group>
          <Group grow>
            <TextInput label="เลขบัตรประชาชน" value={form.citizenNo} onChange={f('citizenNo')} />
            <TextInput label="เบอร์โทร *" value={form.phone} onChange={f('phone')} required />
            <TextInput label="วันเกิด" type="date" value={form.dateOfBirth} onChange={f('dateOfBirth')} />
          </Group>
          <Select label="ประเภทการมา *" data={[
            { value: 'opd', label: 'OPD ทั่วไป' },
            { value: 'specialist', label: 'แพทย์เฉพาะทาง' },
            { value: 'dental', label: 'ทันตกรรม' },
            { value: 'lab', label: 'ตรวจแลบ' },
            { value: 'imaging', label: 'รังสีวิทยา' },
          ]} value={form.visitType} onChange={v => setForm(p => ({ ...p, visitType: v ?? 'opd' }))} />
          <Textarea label="อาการสำคัญ" rows={2} value={form.chiefComplaint} onChange={f('chiefComplaint')} />
          <Group grow>
            <TextInput label="วันที่ต้องการมา *" type="date" value={form.preferredDate} onChange={f('preferredDate')} required />
            <TextInput label="เวลา" type="time" value={form.preferredTime} onChange={f('preferredTime')} />
          </Group>
          <Textarea label="หมายเหตุ" rows={2} value={form.notes} onChange={f('notes')} />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>ยกเลิก</Button>
            <Button color="blue" onClick={handleSubmit}>ลงทะเบียน</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
