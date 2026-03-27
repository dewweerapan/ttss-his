// src/clients/apps/his/src/app/(main)/patients/[id]/page.tsx
'use client';
import '@mantine/charts/styles.css';
import { useParams, useRouter } from 'next/navigation';
import {
  Badge, Button, Group, Paper, Stack,
  Table, Tabs, Text, Title,
} from '@mantine/core';
import { LineChart } from '@mantine/charts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type VitalItem = { recordedAt: string; temperature?: number; bpSystolic?: number; bpDiastolic?: number; heartRate?: number; respRate?: number; spO2?: number; weight?: number; height?: number };
type DiagItem = { code: string; name: string; type: number };
type DrugItem = { code: string; name: string; quantity: number; unit: string; instruction: string; frequency: string };
type DrugOrderItem = { orderNo: string; status: number; items: DrugItem[] };
type LabItem = { testCode: string; testName: string; value?: string; isAbnormal: boolean; referenceRange?: string };
type LabOrderItem = { orderNo: string; status: number; requestDate: string; items: LabItem[] };
type InvoiceItem = { invoiceNo: string; totalAmount: number; status: number };
type EncounterHistory = {
  encounterId: string; encounterNo: string; type: number; status: number;
  division: string; doctor?: string; chiefComplaint?: string;
  admissionDate: string; dischargeDate?: string;
  diagnoses: DiagItem[];
  vitalSigns: VitalItem[];
  drugOrders: DrugOrderItem[];
  labOrders: LabOrderItem[];
  invoice?: InvoiceItem;
};
type PatientHistory = {
  patientId: string; hn: string; fullName: string; birthdate?: string;
  totalEncounters: number; encounters: EncounterHistory[];
};

const ENC_TYPE: Record<number, { label: string; color: string }> = {
  1: { label: 'OPD', color: 'blue' },
  2: { label: 'IPD', color: 'grape' },
  3: { label: 'ER', color: 'red' },
};
const ENC_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'OPEN', color: 'blue' },
  2: { label: 'ADMITTED', color: 'orange' },
  3: { label: 'จำหน่าย', color: 'green' },
  4: { label: 'ปิด', color: 'gray' },
  9: { label: 'ยกเลิก', color: 'red' },
};
const DRUG_STATUS: Record<number, string> = { 1: 'รอตรวจสอบ', 2: 'ตรวจสอบแล้ว', 3: 'จ่ายยาแล้ว', 9: 'ยกเลิก' };

export default function PatientHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['patient-history', patientId],
    queryFn: () => api.get<PatientHistory>(`/api/patients/${patientId}/history`),
    enabled: !!patientId,
  });

  if (isLoading) return <Text>กำลังโหลดประวัติผู้ป่วย...</Text>;
  if (error || !data) return <Text c="red">ไม่พบข้อมูลผู้ป่วย</Text>;

  // Flatten all vitals across encounters for the trend chart
  const allVitals = data.encounters
    .flatMap(enc => enc.vitalSigns)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  const vitalChartData = allVitals
    .filter(v => v.bpSystolic || v.heartRate || v.temperature)
    .map(v => ({
      date: new Date(v.recordedAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
      'SBP': v.bpSystolic ?? null,
      'DBP': v.bpDiastolic ?? null,
      'HR': v.heartRate ?? null,
      'Temp': v.temperature ?? null,
    }));

  return (
    <Stack gap="md">
      <Group>
        <Button variant="subtle" size="xs" onClick={() => router.back()}>← กลับ</Button>
        <Title order={3}>ประวัติผู้ป่วย</Title>
      </Group>

      {/* Patient Info */}
      <Paper withBorder p="md">
        <Group justify="space-between">
          <Stack gap={2}>
            <Text fw={700} size="xl">{data.fullName}</Text>
            <Group gap="md">
              <Text size="sm" c="dimmed">HN: <strong>{data.hn}</strong></Text>
              {data.birthdate && <Text size="sm" c="dimmed">วันเกิด: {new Date(data.birthdate).toLocaleDateString('th-TH')}</Text>}
            </Group>
          </Stack>
          <Badge size="lg" variant="light">{data.totalEncounters} ครั้ง</Badge>
        </Group>
      </Paper>

      {/* Vital Signs Trend Chart */}
      {vitalChartData.length >= 2 && (
        <Paper withBorder p="md">
          <Text size="sm" fw={600} mb="sm">แนวโน้ม Vital Signs</Text>
          <LineChart
            h={200}
            data={vitalChartData}
            dataKey="date"
            series={[
              { name: 'SBP', color: 'red.6', label: 'ความดัน Systolic' },
              { name: 'DBP', color: 'pink.5', label: 'ความดัน Diastolic' },
              { name: 'HR', color: 'blue.6', label: 'ชีพจร' },
              { name: 'Temp', color: 'orange.5', label: 'อุณหภูมิ' },
            ]}
            connectNulls
            withLegend
            legendProps={{ verticalAlign: 'bottom' }}
          />
        </Paper>
      )}

      {/* Encounter Timeline */}
      {data.encounters.length === 0 ? (
        <Paper withBorder p="xl"><Text ta="center" c="dimmed">ยังไม่มีประวัติการรักษา</Text></Paper>
      ) : data.encounters.map((enc) => (
        <Paper key={enc.encounterId} withBorder p="md">
          <Group justify="space-between" mb="sm">
            <Stack gap={2}>
              <Group gap="xs">
                <Badge color={ENC_TYPE[enc.type]?.color ?? 'gray'}>{ENC_TYPE[enc.type]?.label ?? '-'}</Badge>
                <Badge color={ENC_STATUS[enc.status]?.color ?? 'gray'} variant="light">{ENC_STATUS[enc.status]?.label ?? '-'}</Badge>
                <Text fw={600}>{enc.encounterNo}</Text>
              </Group>
              <Group gap="md">
                <Text size="sm" c="dimmed">{enc.division}</Text>
                {enc.doctor && <Text size="sm" c="dimmed">แพทย์: {enc.doctor}</Text>}
                <Text size="sm" c="dimmed">{new Date(enc.admissionDate).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</Text>
              </Group>
              {enc.chiefComplaint && <Text size="sm">อาการ: {enc.chiefComplaint}</Text>}
            </Stack>
            {enc.invoice && (
              <Stack gap={2} align="flex-end">
                <Text size="sm" fw={600}>{enc.invoice.invoiceNo}</Text>
                <Text size="sm">{enc.invoice.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</Text>
              </Stack>
            )}
          </Group>

          <Tabs defaultValue={enc.diagnoses.length > 0 ? 'dx' : enc.vitalSigns.length > 0 ? 'vitals' : 'drugs'}>
            <Tabs.List>
              {enc.diagnoses.length > 0 && <Tabs.Tab value="dx">วินิจฉัย ({enc.diagnoses.length})</Tabs.Tab>}
              {enc.vitalSigns.length > 0 && <Tabs.Tab value="vitals">Vitals ({enc.vitalSigns.length})</Tabs.Tab>}
              {enc.drugOrders.length > 0 && <Tabs.Tab value="drugs">ยา ({enc.drugOrders.length})</Tabs.Tab>}
              {enc.labOrders.length > 0 && <Tabs.Tab value="lab">Lab ({enc.labOrders.length})</Tabs.Tab>}
            </Tabs.List>

            <Tabs.Panel value="dx" pt="xs">
              {enc.diagnoses.map((d, i) => (
                <Text key={i} size="sm">{d.type === 1 ? '🔴' : '🟡'} {d.code} — {d.name}</Text>
              ))}
            </Tabs.Panel>

            <Tabs.Panel value="vitals" pt="xs">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>เวลา</Table.Th><Table.Th>Temp</Table.Th><Table.Th>BP</Table.Th>
                    <Table.Th>HR</Table.Th><Table.Th>SpO2</Table.Th><Table.Th>น้ำหนัก</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {enc.vitalSigns.map((v, i) => (
                    <Table.Tr key={i}>
                      <Table.Td><Text size="xs">{new Date(v.recordedAt).toLocaleString('th-TH')}</Text></Table.Td>
                      <Table.Td><Text size="sm">{v.temperature ?? '-'}</Text></Table.Td>
                      <Table.Td><Text size="sm">{v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : '-'}</Text></Table.Td>
                      <Table.Td><Text size="sm">{v.heartRate ?? '-'}</Text></Table.Td>
                      <Table.Td><Text size="sm">{v.spO2 != null ? `${v.spO2}%` : '-'}</Text></Table.Td>
                      <Table.Td><Text size="sm">{v.weight ?? '-'}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Tabs.Panel>

            <Tabs.Panel value="drugs" pt="xs">
              {enc.drugOrders.map((o, i) => (
                <Stack key={i} gap={2} mb="xs">
                  <Group gap="xs">
                    <Text size="xs" fw={600}>{o.orderNo}</Text>
                    <Badge size="xs" variant="light">{DRUG_STATUS[o.status]}</Badge>
                  </Group>
                  {o.items.map((item, j) => (
                    <Text key={j} size="sm" ml="sm">• {item.name} {item.instruction} {item.frequency} × {item.quantity} {item.unit}</Text>
                  ))}
                </Stack>
              ))}
            </Tabs.Panel>

            <Tabs.Panel value="lab" pt="xs">
              {enc.labOrders.map((o, i) => (
                <Stack key={i} gap={2} mb="sm">
                  <Text size="xs" fw={600}>{o.orderNo} — {new Date(o.requestDate).toLocaleDateString('th-TH')}</Text>
                  {o.items.map((item, j) => (
                    <Group key={j} ml="sm" gap="md">
                      <Text size="sm" style={{ minWidth: 80 }}>{item.testCode}</Text>
                      <Text size="sm" c={item.isAbnormal ? 'red' : undefined} fw={item.isAbnormal ? 700 : undefined}>
                        {item.value ?? 'รอผล'}
                      </Text>
                      {item.referenceRange && <Text size="xs" c="dimmed">[{item.referenceRange}]</Text>}
                      {item.isAbnormal && <Badge size="xs" color="red">ผิดปกติ</Badge>}
                    </Group>
                  ))}
                </Stack>
              ))}
            </Tabs.Panel>
          </Tabs>
        </Paper>
      ))}
    </Stack>
  );
}
