// src/clients/apps/his/src/app/(main)/reports/page.tsx
'use client';
import '@mantine/charts/styles.css';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Paper, SimpleGrid,
  Stack, Table, Text, Title,
} from '@mantine/core';
import { BarChart, LineChart } from '@mantine/charts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type TopDiagnosis = { icd10Code: string; icd10Name: string; count: number };
type DailyCount   = { date: string; count: number };
type DailyAmount  = { date: string; amount: number };
type MonthlyReport = {
  year: number; month: number;
  totalOpd: number; totalIpd: number; totalEr: number;
  totalRevenue: number; totalPaid: number; totalPending: number;
  topDiagnoses: TopDiagnosis[];
  dailyOpd: DailyCount[];
  dailyRevenue: DailyAmount[];
};

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Paper withBorder p="md" style={{ borderTop: `3px solid var(--mantine-color-${color}-6)` }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
      <Text size="xl" fw={800} mt={4}>{value}</Text>
      {sub && <Text size="xs" c="dimmed">{sub}</Text>}
    </Paper>
  );
}

const MONTH_NAMES = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['reports', 'monthly', year, month],
    queryFn: () => api.get<MonthlyReport>(`/api/reports/monthly?year=${year}&month=${month}`),
  });

  const handleExport = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('his_token') : null;
    const base  = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const daysInMonth = new Date(year, month, 0).getDate();
    const rows: string[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const res  = await fetch(`${base}/api/billing/export?date=${date}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!res.ok) continue;
      const text = await res.text();
      const lines = text.split('\n').filter(Boolean);
      if (d === 1) rows.push(...lines);
      else rows.push(...lines.slice(1)); // skip header after first day
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv; charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `billing_${year}${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const opdData    = (report?.dailyOpd ?? []).map(d => ({ date: d.date.slice(5), 'OPD': d.count }));
  const revenueData = (report?.dailyRevenue ?? []).map(d => ({ date: d.date.slice(5), 'รายได้': d.amount }));

  const years  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={0}>
          <Title order={3}>รายงานประจำเดือน</Title>
          <Text size="sm" c="dimmed">{MONTH_NAMES[month]} {year + 543}</Text>
        </Stack>
        <Group gap="xs">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '6px 8px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 14 }}>
            {months.map(m => <option key={m} value={m}>{MONTH_NAMES[m]}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '6px 8px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 14 }}>
            {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
          </select>
          <Button variant="light" size="xs" onClick={() => refetch()}>โหลด</Button>
          <Button variant="light" color="teal" size="xs" onClick={handleExport}>Export CSV</Button>
        </Group>
      </Group>

      {isLoading && <Text c="dimmed">กำลังโหลด...</Text>}

      {report && (
        <>
          {/* KPI */}
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
            <StatCard label="OPD"        value={report.totalOpd}     color="blue" />
            <StatCard label="IPD"        value={report.totalIpd}     color="grape" />
            <StatCard label="ER"         value={report.totalEr}      color="red" />
            <StatCard label="รายได้รวม (฿)" value={report.totalRevenue.toLocaleString('th-TH', { maximumFractionDigits: 0 })} color="green" />
            <StatCard label="ชำระแล้ว (฿)"  value={report.totalPaid.toLocaleString('th-TH',    { maximumFractionDigits: 0 })} color="teal" />
            <StatCard label="ค้างชำระ (฿)"  value={report.totalPending.toLocaleString('th-TH', { maximumFractionDigits: 0 })} color="orange" />
          </SimpleGrid>

          {/* Charts */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Paper withBorder p="md">
              <Text fw={600} size="sm" mb="sm">ผู้ป่วย OPD รายวัน</Text>
              {opdData.length > 1
                ? <LineChart h={200} data={opdData} dataKey="date" series={[{ name: 'OPD', color: 'blue.6' }]} withLegend={false} />
                : <Alert color="gray">ยังไม่มีข้อมูลเพียงพอ</Alert>}
            </Paper>
            <Paper withBorder p="md">
              <Text fw={600} size="sm" mb="sm">รายได้รายวัน (฿)</Text>
              {revenueData.length > 0
                ? <BarChart h={200} data={revenueData} dataKey="date" series={[{ name: 'รายได้', color: 'teal.6' }]} />
                : <Alert color="gray">ยังไม่มีข้อมูล</Alert>}
            </Paper>
          </SimpleGrid>

          {/* Top diagnoses */}
          <Paper withBorder>
            <Stack gap={0} p="md">
              <Text fw={600} mb="sm">10 อันดับโรคที่พบบ่อย</Text>
              {report.topDiagnoses.length === 0
                ? <Text c="dimmed" size="sm">ไม่มีข้อมูล</Text>
                : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>#</Table.Th>
                        <Table.Th>ICD-10</Table.Th>
                        <Table.Th>ชื่อโรค</Table.Th>
                        <Table.Th ta="right">จำนวน</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {report.topDiagnoses.map((d, i) => (
                        <Table.Tr key={d.icd10Code}>
                          <Table.Td><Text size="sm" c="dimmed">{i + 1}</Text></Table.Td>
                          <Table.Td><Badge size="sm" variant="light">{d.icd10Code}</Badge></Table.Td>
                          <Table.Td><Text size="sm">{d.icd10Name}</Text></Table.Td>
                          <Table.Td ta="right"><Text size="sm" fw={700}>{d.count}</Text></Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
            </Stack>
          </Paper>
        </>
      )}
    </Stack>
  );
}
