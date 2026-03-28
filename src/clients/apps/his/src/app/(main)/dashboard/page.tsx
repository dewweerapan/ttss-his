'use client';
import '@mantine/charts/styles.css';
import { useState } from 'react';
import {
  Badge, Button, Collapse, Divider, Group, Paper, RingProgress,
  SimpleGrid, Stack, Table, Text, ThemeIcon, Title,
} from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  IconUsers, IconBed, IconAmbulance, IconArrowBarRight,
  IconCurrencyBaht, IconReceipt, IconPill, IconFlask,
  IconAlertTriangle, IconChevronDown, IconChevronUp,
} from '@tabler/icons-react';

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
type LowStockItem = { id: string; code: string; name: string; unit: string; stockQuantity: number; reorderLevel: number };

const ENC_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'OPEN', color: 'blue' },
  3: { label: 'จำหน่าย', color: 'green' },
  4: { label: 'ปิด', color: 'gray' },
  9: { label: 'ยกเลิก', color: 'red' },
};

type KpiCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ComponentType<{ size?: number | string }>;
  color: string;
};

function KpiCard({ label, value, sublabel, icon: Icon, color }: KpiCardProps) {
  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      style={{ transition: 'box-shadow 0.15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <Group gap="md" align="flex-start">
        <ThemeIcon color={color} variant="light" size="lg" radius="md">
          <Icon size={18} />
        </ThemeIcon>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
          <Text style={{ fontSize: 28 }} fw={800} lh={1}>{value}</Text>
          {sublabel && <Text size="xs" c="dimmed">{sublabel}</Text>}
        </Stack>
      </Group>
    </Paper>
  );
}

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0];
  const [alertOpen, setAlertOpen] = useState(true);

  const { data: stats, refetch: refetchStats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats', today],
    queryFn: () => api.get<DashboardStats>(`/api/dashboard/stats?date=${today}`),
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
    queryKey: ['dashboard', 'opd-report', today],
    queryFn: () => api.get<OpdReportItem[]>(`/api/dashboard/opd-report?date=${today}`),
    refetchInterval: 60000,
  });

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
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={3}>Dashboard</Title>
          <Text size="sm" c="dimmed">วันที่ {new Date(today).toLocaleDateString('th-TH', { dateStyle: 'long' })}</Text>
        </Stack>
        <Button variant="light" size="xs" onClick={() => refetchStats()}>รีเฟรช</Button>
      </Group>

      {/* Collapsible Low Stock Alert */}
      {lowStock.length > 0 && (
        <Paper
          radius="md"
          style={{
            borderLeft: '4px solid var(--mantine-color-orange-6)',
            backgroundColor: 'var(--mantine-color-orange-0)',
            padding: '12px 16px',
          }}
        >
          <Group justify="space-between" mb={alertOpen ? 'xs' : 0}>
            <Group gap="xs">
              <IconAlertTriangle size={16} color="var(--mantine-color-orange-7)" />
              <Text size="sm" fw={600} c="orange.8">
                สินค้า/ยาใกล้หมดคลัง ({lowStock.length} รายการ) — กรุณาสั่งซื้อ
              </Text>
            </Group>
            <Button
              variant="subtle"
              color="orange"
              size="xs"
              rightSection={alertOpen ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
              onClick={() => setAlertOpen((o) => !o)}
            >
              {alertOpen ? 'ซ่อน' : 'แสดง'}
            </Button>
          </Group>
          <Collapse in={alertOpen}>
            <Group gap="xs" wrap="wrap" mt="xs">
              {lowStock.map((p) => (
                <Badge key={p.id} color="orange" variant="outline" size="sm">
                  {p.code}: {p.stockQuantity}/{p.reorderLevel} {p.unit}
                </Badge>
              ))}
            </Group>
          </Collapse>
        </Paper>
      )}

      {isLoading ? (
        <Text c="dimmed">กำลังโหลด...</Text>
      ) : stats ? (
        <>
          {/* KPI Row 1 — Volume */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <KpiCard label="OPD วันนี้" value={stats.opdToday} icon={IconUsers} color="blue" />
            <KpiCard label="IPD (กำลังรักษา)" value={stats.ipdAdmitted} icon={IconBed} color="grape" />
            <KpiCard label="ER วันนี้" value={stats.erToday} icon={IconAmbulance} color="red" />
            <KpiCard label="จำหน่าย IPD วันนี้" value={stats.ipdDischarged} icon={IconArrowBarRight} color="teal" />
          </SimpleGrid>

          {/* KPI Row 2 — Financial / Pending */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <KpiCard
              label="รายได้วันนี้ (฿)"
              value={stats.revenueToday.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              icon={IconCurrencyBaht}
              color="green"
            />
            <KpiCard label="ใบแจ้งหนี้รอชำระ" value={stats.invoicesPending} icon={IconReceipt} color="yellow" />
            <KpiCard label="ใบสั่งยารอตรวจ" value={stats.drugOrdersPending} icon={IconPill} color="orange" />
            <KpiCard
              label="Lab วันนี้"
              value={`${stats.labCompleted}/${stats.labOrdersToday}`}
              sublabel="เสร็จสิ้น/สั่งตรวจ"
              icon={IconFlask}
              color="cyan"
            />
          </SimpleGrid>

          {/* Ring Progress — Bed + Queue */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Paper withBorder p="md" radius="md">
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
                  <Text size="xs" c="dimmed">รวม {stats.totalBeds} เตียง</Text>
                </Stack>
              </Group>
            </Paper>

            <Paper withBorder p="md" radius="md">
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

          {/* Revenue Chart */}
          {revenue.length > 0 && (
            <Paper withBorder p="md" radius="md">
              <Text size="sm" fw={600} mb="sm">รายได้ 7 วันย้อนหลัง (฿)</Text>
              <BarChart
                h={220}
                data={revenue.map((r) => ({
                  date: new Date(r.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
                  'รายได้': r.amount,
                }))}
                dataKey="date"
                series={[{ name: 'รายได้', color: 'teal.6' }]}
                tickLine="y"
              />
            </Paper>
          )}

          {/* IPD Census Table */}
          {census.length > 0 && (
            <Paper withBorder p="md" radius="md">
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
                  {census.map((w) => (
                    <Table.Tr key={w.wardId}>
                      <Table.Td>
                        <Text fw={500}>{w.wardCode}</Text>
                        <Text size="xs" c="dimmed">{w.wardName}</Text>
                      </Table.Td>
                      <Table.Td ta="center">{w.totalBeds}</Table.Td>
                      <Table.Td ta="center">
                        <Text c={w.occupiedBeds > 0 ? 'red' : undefined}>{w.occupiedBeds}</Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Text c={w.availableBeds > 0 ? 'green' : 'orange'}>{w.availableBeds}</Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge
                          color={w.totalBeds > 0 && (w.occupiedBeds / w.totalBeds) > 0.8 ? 'red' : 'green'}
                          variant="light"
                        >
                          {w.totalBeds > 0 ? Math.round((w.occupiedBeds / w.totalBeds) * 100) : 0}%
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}

          {/* OPD Report Table */}
          {opdReport.length > 0 && (
            <Paper withBorder p="md" radius="md">
              <Text size="sm" fw={600} mb="sm">รายชื่อผู้ป่วย OPD วันนี้ ({opdReport.length} ราย)</Text>
              <Divider mb="sm" />
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
                  {opdReport.map((enc) => (
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
                        <Text size="sm">
                          {enc.invoiceAmount != null
                            ? enc.invoiceAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                            : '-'}
                        </Text>
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
