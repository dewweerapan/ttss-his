'use client';
import '@mantine/charts/styles.css';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Paper, RingProgress, SimpleGrid, Stack,
  Table, Text, Title,
} from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type DashboardStats = {
  date: string;
  opdToday: number; ipdAdmitted: number; ipdDischarged: number; erToday: number;
  totalBeds: number; occupiedBeds: number;
  queueTotal: number; queueDone: number;
  revenueToday: number;
  labOrdersToday: number; labCompleted: number;
  drugOrdersPending: number; invoicesPending: number;
};
type IpdCensusItem = { wardId: string; wardCode: string; wardName: string; totalBeds: number; occupiedBeds: number; availableBeds: number };
type RevenueDayItem = { date: string; amount: number; count: number };
type OpdReportItem = { encounterNo: string; hn: string; patientName: string; doctorName: string; status: number; admissionDate: string; invoiceAmount?: number; invoiceStatus?: number };

const ENC_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'OPEN', color: 'blue' },
  3: { label: 'จำหน่าย', color: 'green' },
  4: { label: 'ปิด', color: 'gray' },
  9: { label: 'ยกเลิก', color: 'red' },
};

function StatCard({ label, value, sublabel, color = 'blue' }: { label: string; value: string | number; sublabel?: string; color?: string }) {
  return (
    <Paper withBorder p="md" style={{ borderTop: `3px solid var(--mantine-color-${color}-6)` }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
      <Text size="xl" fw={800} mt={4}>{value}</Text>
      {sublabel && <Text size="xs" c="dimmed">{sublabel}</Text>}
    </Paper>
  );
}

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate] = useState(today);

  const { data: stats, refetch: refetchStats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats', selectedDate],
    queryFn: () => api.get<DashboardStats>(`/api/dashboard/stats?date=${selectedDate}`),
    refetchInterval: 60000,
  });

  const { data: census = [] } = useQuery({
    queryKey: ['dashboard', 'census'],
    queryFn: () => api.get<IpdCensusItem[]>('/api/dashboard/ipd-census'),
    refetchInterval: 60000,
  });

  const { data: revenue = [] } = useQuery({
    queryKey: ['dashboard', 'revenue'],
    queryFn: () => api.get<RevenueDayItem[]>('/api/dashboard/revenue'),
  });

  const { data: opdReport = [] } = useQuery({
    queryKey: ['dashboard', 'opd-report', selectedDate],
    queryFn: () => api.get<OpdReportItem[]>(`/api/dashboard/opd-report?date=${selectedDate}`),
    refetchInterval: 60000,
  });

  type LowStockItem = { id: string; code: string; name: string; unit: string; stockQuantity: number; reorderLevel: number };
  const { data: lowStock = [] } = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: () => api.get<LowStockItem[]>('/api/admin/stock/low'),
    refetchInterval: 120000,
  });

  const bedOccupancyPct = stats && stats.totalBeds > 0
    ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100)
    : 0;

  const queueDonePct = stats && stats.queueTotal > 0
    ? Math.round((stats.queueDone / stats.queueTotal) * 100)
    : 0;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={3}>Dashboard</Title>
          <Text size="sm" c="dimmed">วันที่ {new Date(selectedDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}</Text>
        </Stack>
        <Button variant="light" size="xs" onClick={() => refetchStats()}>รีเฟรช</Button>
      </Group>

      {lowStock.length > 0 && (
        <Alert color="orange" title={`⚠️ สินค้า/ยาใกล้หมดคลัง (${lowStock.length} รายการ) — กรุณาสั่งซื้อ`}>
          <Group gap="xs" wrap="wrap">
            {lowStock.map(p => (
              <Badge key={p.id} color="orange" variant="outline" size="sm">
                {p.code}: {p.stockQuantity}/{p.reorderLevel} {p.unit}
              </Badge>
            ))}
          </Group>
        </Alert>
      )}

      {isLoading ? (
        <Text c="dimmed">กำลังโหลด...</Text>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <StatCard label="OPD วันนี้" value={stats.opdToday} color="blue" />
            <StatCard label="IPD (กำลังรักษา)" value={stats.ipdAdmitted} color="grape" />
            <StatCard label="ER วันนี้" value={stats.erToday} color="red" />
            <StatCard label="จำหน่าย IPD วันนี้" value={stats.ipdDischarged} color="teal" />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <StatCard label="รายได้วันนี้ (฿)" value={stats.revenueToday.toLocaleString('th-TH', { minimumFractionDigits: 2 })} color="green" />
            <StatCard label="ใบแจ้งหนี้รอชำระ" value={stats.invoicesPending} color="yellow" />
            <StatCard label="ใบสั่งยารอตรวจ" value={stats.drugOrdersPending} color="orange" />
            <StatCard label="Lab วันนี้" value={`${stats.labCompleted}/${stats.labOrdersToday}`} sublabel="เสร็จสิ้น/สั่งตรวจ" color="cyan" />
          </SimpleGrid>

          {/* Bed Occupancy + Queue */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Paper withBorder p="md">
              <Text size="sm" fw={600} mb="sm">ความจุเตียง</Text>
              <Group align="center">
                <RingProgress
                  size={100} thickness={12}
                  sections={[{ value: bedOccupancyPct, color: bedOccupancyPct > 80 ? 'red' : bedOccupancyPct > 60 ? 'orange' : 'green' }]}
                  label={<Text ta="center" size="sm" fw={700}>{bedOccupancyPct}%</Text>}
                />
                <Stack gap={4}>
                  <Text size="sm">มีผู้ป่วย: <strong>{stats.occupiedBeds}</strong> เตียง</Text>
                  <Text size="sm">ว่าง: <strong>{stats.totalBeds - stats.occupiedBeds}</strong> เตียง</Text>
                  <Text size="sm" c="dimmed">รวม {stats.totalBeds} เตียง</Text>
                </Stack>
              </Group>
            </Paper>

            <Paper withBorder p="md">
              <Text size="sm" fw={600} mb="sm">คิวผู้ป่วย OPD</Text>
              <Group align="center">
                <RingProgress
                  size={100} thickness={12}
                  sections={[{ value: queueDonePct, color: 'green' }]}
                  label={<Text ta="center" size="sm" fw={700}>{queueDonePct}%</Text>}
                />
                <Stack gap={4}>
                  <Text size="sm">เสร็จแล้ว: <strong>{stats.queueDone}</strong></Text>
                  <Text size="sm">รวมวันนี้: <strong>{stats.queueTotal}</strong></Text>
                </Stack>
              </Group>
            </Paper>
          </SimpleGrid>

          {/* IPD Census by Ward */}
          {census.length > 0 && (
            <Paper withBorder p="md">
              <Text size="sm" fw={600} mb="sm">สถานะเตียงแยกตามหอผู้ป่วย</Text>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>หอผู้ป่วย</Table.Th>
                    <Table.Th ta="center">เตียงทั้งหมด</Table.Th>
                    <Table.Th ta="center">มีผู้ป่วย</Table.Th>
                    <Table.Th ta="center">ว่าง</Table.Th>
                    <Table.Th ta="center">อัตราครองเตียง</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {census.map(w => (
                    <Table.Tr key={w.wardId}>
                      <Table.Td><Text fw={500}>{w.wardCode}</Text><Text size="xs" c="dimmed">{w.wardName}</Text></Table.Td>
                      <Table.Td ta="center">{w.totalBeds}</Table.Td>
                      <Table.Td ta="center"><Text c={w.occupiedBeds > 0 ? 'red' : undefined}>{w.occupiedBeds}</Text></Table.Td>
                      <Table.Td ta="center"><Text c={w.availableBeds > 0 ? 'green' : 'orange'}>{w.availableBeds}</Text></Table.Td>
                      <Table.Td ta="center">
                        <Badge color={w.totalBeds > 0 && (w.occupiedBeds / w.totalBeds) > 0.8 ? 'red' : 'green'} variant="light">
                          {w.totalBeds > 0 ? Math.round((w.occupiedBeds / w.totalBeds) * 100) : 0}%
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}

          {/* Revenue 7 days — bar chart */}
          {revenue.length > 0 && (
            <Paper withBorder p="md">
              <Text size="sm" fw={600} mb="sm">รายได้ 7 วันย้อนหลัง (฿)</Text>
              <BarChart
                h={220}
                data={revenue.map(r => ({
                  date: new Date(r.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
                  'รายได้': r.amount,
                }))}
                dataKey="date"
                series={[{ name: 'รายได้', color: 'teal.6' }]}
                tickLine="y"
              />
            </Paper>
          )}

          {/* OPD Report */}
          {opdReport.length > 0 && (
            <Paper withBorder p="md">
              <Text size="sm" fw={600} mb="sm">รายชื่อผู้ป่วย OPD วันนี้ ({opdReport.length} ราย)</Text>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>VN</Table.Th>
                    <Table.Th>ผู้ป่วย</Table.Th>
                    <Table.Th>แพทย์</Table.Th>
                    <Table.Th>สถานะ</Table.Th>
                    <Table.Th ta="right">ยอดเรียกเก็บ (฿)</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {opdReport.map(enc => (
                    <Table.Tr key={enc.encounterNo}>
                      <Table.Td><Text size="sm">{enc.encounterNo}</Text></Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>{enc.patientName}</Text>
                        <Text size="xs" c="dimmed">{enc.hn}</Text>
                      </Table.Td>
                      <Table.Td><Text size="sm">{enc.doctorName}</Text></Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={ENC_STATUS[enc.status]?.color ?? 'gray'}>
                          {ENC_STATUS[enc.status]?.label ?? enc.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm">{enc.invoiceAmount != null ? enc.invoiceAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </>
      ) : null}
    </Stack>
  );
}
