// src/clients/apps/his/src/app/(main)/phr/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Divider, Group, Paper, Stack, Table, Text, TextInput, Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Patient = {
  id: string; hn: string; firstName: string; lastName: string; preName?: string;
  citizenNo?: string; dateOfBirth?: string; gender?: number; phone?: string;
};
type Encounter = {
  id: string; encounterNo: string; encounterDate: string; encounterType?: number;
  chiefComplaint?: string; status: number;
};
type LabOrderDto = {
  id: string; orderNo: string; requestDate: string; status: number;
  items: { testCode: string; testName: string; unit?: string; result?: { value: string; isAbnormal: boolean } }[];
};
type ImagingOrder = {
  id: string; studyName: string; modalityType: number; orderDate: string; status: number;
  impression?: string;
};
type Diagnosis = {
  id: string; icd10Code: string; icd10Name?: string; diagnosisType: number;
};

const GENDER: Record<number, string> = { 1: 'ชาย', 2: 'หญิง', 9: 'ไม่ระบุ' };
const ENC_TYPE: Record<number, string> = { 1: 'OPD', 2: 'IPD', 9: 'อื่นๆ' };
const MODALITY: Record<number, string> = { 1: 'X-Ray', 2: 'CT', 3: 'MRI', 4: 'Ultrasound', 5: 'Nuclear', 9: 'อื่นๆ' };

export default function PhrPage() {
  const [searchHn, setSearchHn] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data: patients = [] } = useQuery({
    queryKey: ['patient-search-phr', searchHn],
    queryFn: () => api.get<Patient[]>(`/api/patients?search=${searchHn}`),
    enabled: searchHn.length >= 2,
  });

  const { data: encounters = [] } = useQuery({
    queryKey: ['encounters-phr', selectedPatient?.id],
    queryFn: () => api.get<Encounter[]>(`/api/admissions?patientId=${selectedPatient!.id}`),
    enabled: !!selectedPatient,
  });

  const { data: labHistory = [] } = useQuery({
    queryKey: ['lab-history-phr', selectedPatient?.id],
    queryFn: () => api.get<LabOrderDto[]>(`/api/patients/${selectedPatient!.id}/lab-history`),
    enabled: !!selectedPatient,
  });

  const { data: imagingOrders = [] } = useQuery({
    queryKey: ['imaging-phr', selectedPatient?.id],
    queryFn: () => api.get<ImagingOrder[]>(`/api/imaging-orders?patientId=${selectedPatient!.id}`),
    enabled: !!selectedPatient,
  });

  const handleExport = () => {
    if (!selectedPatient) return;
    const data = {
      patient: selectedPatient,
      encounters,
      labHistory,
      imagingOrders,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phr_${selectedPatient.hn}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack gap="md">
      <Title order={3}>บันทึกสุขภาพส่วนตัว (Personal Health Record)</Title>

      <Paper withBorder p="sm">
        <Stack gap="sm">
          <Text fw={500}>ค้นหาผู้ป่วย</Text>
          <TextInput
            placeholder="พิมพ์ HN หรือชื่อ..."
            value={searchHn}
            onChange={e => setSearchHn(e.target.value)}
          />
          {searchHn.length >= 2 && (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr><Table.Th>HN</Table.Th><Table.Th>ชื่อ</Table.Th><Table.Th></Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {patients.length === 0 ? (
                  <Table.Tr><Table.Td colSpan={3}><Text ta="center" c="dimmed">ไม่พบผู้ป่วย</Text></Table.Td></Table.Tr>
                ) : patients.map(p => (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.hn}</Table.Td>
                    <Table.Td>{p.preName}{p.firstName} {p.lastName}</Table.Td>
                    <Table.Td>
                      <Button size="xs" variant="light" onClick={() => { setSelectedPatient(p); setSearchHn(''); }}>เลือก</Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Paper>

      {selectedPatient && (
        <Stack gap="md">
          <Group justify="space-between">
            <Group>
              <Text fw={700} size="lg">{selectedPatient.preName}{selectedPatient.firstName} {selectedPatient.lastName}</Text>
              <Badge variant="light">HN: {selectedPatient.hn}</Badge>
            </Group>
            <Group gap="xs">
              <Button size="xs" variant="subtle" color="red" onClick={() => setSelectedPatient(null)}>เปลี่ยนผู้ป่วย</Button>
              <Button size="sm" variant="light" color="green" onClick={handleExport}>ส่งออกข้อมูล (JSON)</Button>
            </Group>
          </Group>

          {/* Patient Demographics */}
          <Paper withBorder p="sm">
            <Text fw={600} mb="xs">ข้อมูลส่วนตัว</Text>
            <Group gap="xl">
              {selectedPatient.gender && <Text size="sm">เพศ: {GENDER[selectedPatient.gender] ?? '-'}</Text>}
              {selectedPatient.dateOfBirth && (
                <Text size="sm">วันเกิด: {new Date(selectedPatient.dateOfBirth).toLocaleDateString('th-TH')}</Text>
              )}
              {selectedPatient.citizenNo && <Text size="sm">เลขบัตรประชาชน: {selectedPatient.citizenNo}</Text>}
              {selectedPatient.phone && <Text size="sm">โทรศัพท์: {selectedPatient.phone}</Text>}
            </Group>
          </Paper>

          {/* Visit History */}
          <Paper withBorder p="sm">
            <Text fw={600} mb="xs">ประวัติการมาพบแพทย์ ({encounters.length} ครั้ง)</Text>
            {encounters.length === 0 ? (
              <Text c="dimmed" size="sm">ไม่มีประวัติ</Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>เลขที่</Table.Th><Table.Th>ประเภท</Table.Th>
                    <Table.Th>วันที่</Table.Th><Table.Th>เหตุผล</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {encounters.slice(0, 10).map(e => (
                    <Table.Tr key={e.id}>
                      <Table.Td><Text size="sm">{e.encounterNo}</Text></Table.Td>
                      <Table.Td><Badge size="xs" variant="light">{ENC_TYPE[e.encounterType ?? 1]}</Badge></Table.Td>
                      <Table.Td><Text size="xs">{new Date(e.encounterDate).toLocaleDateString('th-TH')}</Text></Table.Td>
                      <Table.Td><Text size="sm">{e.chiefComplaint ?? '-'}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>

          {/* Lab Summary */}
          <Paper withBorder p="sm">
            <Text fw={600} mb="xs">ผลตรวจแลบ ({labHistory.length} ใบสั่ง)</Text>
            {labHistory.length === 0 ? (
              <Text c="dimmed" size="sm">ไม่มีผลแลบ</Text>
            ) : labHistory.slice(0, 5).map(o => (
              <Stack key={o.id} gap={4} mb="xs">
                <Text size="xs" c="dimmed">{o.orderNo} — {new Date(o.requestDate).toLocaleDateString('th-TH')}</Text>
                <Group gap="xs" wrap="wrap">
                  {o.items.map(i => (
                    <Badge key={i.testCode} size="xs"
                      color={i.result?.isAbnormal ? 'red' : 'gray'}
                      variant={i.result ? 'filled' : 'outline'}>
                      {i.testName}: {i.result?.value ?? '?'} {i.unit ?? ''}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            ))}
          </Paper>

          {/* Imaging Summary */}
          <Paper withBorder p="sm">
            <Text fw={600} mb="xs">ผลภาพถ่ายรังสี ({imagingOrders.length} รายการ)</Text>
            {imagingOrders.length === 0 ? (
              <Text c="dimmed" size="sm">ไม่มีผล</Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ชนิด</Table.Th><Table.Th>การศึกษา</Table.Th>
                    <Table.Th>วันที่</Table.Th><Table.Th>ผลสรุป</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {imagingOrders.slice(0, 10).map(i => (
                    <Table.Tr key={i.id}>
                      <Table.Td><Badge size="xs" variant="light">{MODALITY[i.modalityType]}</Badge></Table.Td>
                      <Table.Td><Text size="sm">{i.studyName}</Text></Table.Td>
                      <Table.Td><Text size="xs">{new Date(i.orderDate).toLocaleDateString('th-TH')}</Text></Table.Td>
                      <Table.Td><Text size="sm">{i.impression ?? '-'}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}
