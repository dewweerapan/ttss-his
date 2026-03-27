// src/clients/apps/his/src/app/(main)/triage/page.tsx
'use client';
import { useState } from 'react';
import {
  Badge, Button, Divider, Grid, Group, NumberInput, Paper,
  Stack, Table, Text, Textarea, Title, Alert,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
type EncounterItem = {
  id: string; encounterNo: string; patientName: string; hn: string;
  status: number; chiefComplaint?: string;
  queueNo?: string; queueStatus?: number;
  admissionDate: string;
};
type EncounterListResponse = { items: EncounterItem[] };
type VitalSignInfo = {
  temperature?: number; pulseRate?: number; respiratoryRate?: number;
  bpSystolic?: number; bpDiastolic?: number; o2Sat?: number;
  weight?: number; height?: number; recordedDate: string;
};
type EncounterDetail = {
  id: string; encounterNo: string; chiefComplaint?: string;
  latestVitals?: VitalSignInfo;
  patient: { hn: string; firstName: string; lastName: string; preName?: string; birthdate?: string; };
};

const STATUS_COLOR: Record<number, string> = { 1: 'yellow', 2: 'blue', 3: 'green', 4: 'gray' };
const STATUS_LABEL: Record<number, string> = { 1: 'รอเรียก', 2: 'เรียกแล้ว', 3: 'กำลังตรวจ', 4: 'เสร็จ' };

// ── Page ───────────────────────────────────────────────────────────────────
export default function TriagePage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [temperature, setTemperature] = useState<number | string>('');
  const [pulseRate, setPulseRate] = useState<number | string>('');
  const [respiratoryRate, setRespiratoryRate] = useState<number | string>('');
  const [bpSystolic, setBpSystolic] = useState<number | string>('');
  const [bpDiastolic, setBpDiastolic] = useState<number | string>('');
  const [o2Sat, setO2Sat] = useState<number | string>('');
  const [weight, setWeight] = useState<number | string>('');
  const [height, setHeight] = useState<number | string>('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data: listData, isLoading } = useQuery({
    queryKey: ['encounters', 'triage'],
    queryFn: () => api.get<EncounterListResponse>('/api/encounters?status=1'),
    refetchInterval: 30000,
  });

  const { data: detail } = useQuery({
    queryKey: ['encounter', selectedId],
    queryFn: () => api.get<EncounterDetail>(`/api/encounters/${selectedId}`),
    enabled: !!selectedId,
  });

  const handleSelect = (item: EncounterItem) => {
    setSelectedId(item.id);
    setChiefComplaint(item.chiefComplaint ?? '');
    setSuccessMsg('');
  };

  const triage = useMutation({
    mutationFn: (body: object) =>
      api.patch(`/api/encounters/${selectedId}/triage`, body),
    onSuccess: () => {
      setSuccessMsg('บันทึกสัญญาณชีพสำเร็จ');
      qc.invalidateQueries({ queryKey: ['encounter', selectedId] });
      qc.invalidateQueries({ queryKey: ['encounters'] });
    },
  });

  const handleSave = () => {
    triage.mutate({
      chiefComplaint: chiefComplaint || undefined,
      temperature: temperature !== '' ? Number(temperature) : undefined,
      pulseRate: pulseRate !== '' ? Number(pulseRate) : undefined,
      respiratoryRate: respiratoryRate !== '' ? Number(respiratoryRate) : undefined,
      bpSystolic: bpSystolic !== '' ? Number(bpSystolic) : undefined,
      bpDiastolic: bpDiastolic !== '' ? Number(bpDiastolic) : undefined,
      o2Sat: o2Sat !== '' ? Number(o2Sat) : undefined,
      weight: weight !== '' ? Number(weight) : undefined,
      height: height !== '' ? Number(height) : undefined,
    });
  };

  const encounters = listData?.items ?? [];
  const v = detail?.latestVitals;

  return (
    <Grid gutter="md">
      {/* Left: encounter list */}
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="sm">
          <Title order={4}>รายชื่อผู้ป่วยวันนี้</Title>
          <Paper withBorder>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>คิว</Table.Th>
                  <Table.Th>HN / ชื่อ</Table.Th>
                  <Table.Th>สถานะ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading ? (
                  <Table.Tr><Table.Td colSpan={3}><Text ta="center">กำลังโหลด...</Text></Table.Td></Table.Tr>
                ) : encounters.length === 0 ? (
                  <Table.Tr><Table.Td colSpan={3}><Text ta="center" c="dimmed">ไม่มีผู้ป่วยวันนี้</Text></Table.Td></Table.Tr>
                ) : encounters.map((enc) => (
                  <Table.Tr
                    key={enc.id}
                    onClick={() => handleSelect(enc)}
                    style={{ cursor: 'pointer', background: selectedId === enc.id ? '#e8f4fd' : undefined }}
                  >
                    <Table.Td><Text fw={700}>{enc.queueNo ?? '-'}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{enc.patientName}</Text>
                      <Text size="xs" c="dimmed">{enc.hn}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" color={STATUS_COLOR[enc.queueStatus ?? enc.status] ?? 'gray'}>
                        {STATUS_LABEL[enc.queueStatus ?? enc.status] ?? '-'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>
      </Grid.Col>

      {/* Right: vitals form */}
      <Grid.Col span={{ base: 12, md: 7 }}>
        {!selectedId ? (
          <Paper withBorder p="xl">
            <Text ta="center" c="dimmed">เลือกผู้ป่วยจากรายชื่อด้านซ้าย</Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            <Title order={4}>บันทึกสัญญาณชีพ</Title>
            {successMsg && <Alert color="green">{successMsg}</Alert>}

            {detail && (
              <Paper withBorder p="sm">
                <Text fw={600}>{(detail.patient.preName ?? '') + detail.patient.firstName + ' ' + detail.patient.lastName}</Text>
                <Text size="sm" c="dimmed">HN: {detail.patient.hn} | VN: {detail.encounterNo}</Text>
                {v && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Vitals ล่าสุด: {v.recordedDate ? new Date(v.recordedDate).toLocaleTimeString('th-TH') : '-'}
                  </Text>
                )}
              </Paper>
            )}

            <Textarea
              label="อาการสำคัญ (Chief Complaint)"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              rows={2}
            />

            <Divider label="สัญญาณชีพ" />

            <Grid>
              <Grid.Col span={6}>
                <NumberInput label="อุณหภูมิ (°C)" value={temperature} onChange={setTemperature}
                  min={30} max={45} decimalScale={1} placeholder={v?.temperature?.toString()} />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput label="ชีพจร (ครั้ง/นาที)" value={pulseRate} onChange={setPulseRate}
                  min={0} max={300} placeholder={v?.pulseRate?.toString()} />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput label="การหายใจ (ครั้ง/นาที)" value={respiratoryRate} onChange={setRespiratoryRate}
                  min={0} max={100} placeholder={v?.respiratoryRate?.toString()} />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput label="O2 Sat (%)" value={o2Sat} onChange={setO2Sat}
                  min={0} max={100} placeholder={v?.o2Sat?.toString()} />
              </Grid.Col>
              <Grid.Col span={3}>
                <NumberInput label="BP Systolic" value={bpSystolic} onChange={setBpSystolic}
                  min={0} max={300} placeholder={v?.bpSystolic?.toString()} />
              </Grid.Col>
              <Grid.Col span={3}>
                <NumberInput label="BP Diastolic" value={bpDiastolic} onChange={setBpDiastolic}
                  min={0} max={200} placeholder={v?.bpDiastolic?.toString()} />
              </Grid.Col>
              <Grid.Col span={3}>
                <NumberInput label="น้ำหนัก (กก.)" value={weight} onChange={setWeight}
                  min={0} max={300} decimalScale={1} placeholder={v?.weight?.toString()} />
              </Grid.Col>
              <Grid.Col span={3}>
                <NumberInput label="ส่วนสูง (ซม.)" value={height} onChange={setHeight}
                  min={0} max={250} decimalScale={1} placeholder={v?.height?.toString()} />
              </Grid.Col>
            </Grid>

            <Group justify="flex-end">
              <Button onClick={handleSave} loading={triage.isPending}>บันทึกสัญญาณชีพ</Button>
            </Group>
          </Stack>
        )}
      </Grid.Col>
    </Grid>
  );
}
