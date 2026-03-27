// src/clients/apps/his/src/app/(main)/ward/page.tsx
'use client';
import { useState } from 'react';
import {
  Badge, Button, Grid, Group, Paper, Select, Stack, Text, Title, Tooltip,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Ward = { id: string; code: string; name: string; type: number; totalBeds: number };
type Bed = {
  id: string; bedNo: string; wardId: string; status: number;
  currentEncounterId?: string; encounterNo?: string; patientName?: string; hn?: string;
};

const BED_STATUS_COLOR: Record<number, string> = { 1: 'green', 2: 'red', 3: 'orange' };
const BED_STATUS_LABEL: Record<number, string> = { 1: 'ว่าง', 2: 'มีผู้ป่วย', 3: 'ซ่อมบำรุง' };

export default function WardPage() {
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);

  const { data: wards = [], isLoading: wardsLoading } = useQuery({
    queryKey: ['wards'],
    queryFn: () => api.get<Ward[]>('/api/wards'),
  });

  const { data: beds = [], isLoading: bedsLoading, refetch: refetchBeds } = useQuery({
    queryKey: ['wards', selectedWardId, 'beds'],
    queryFn: () => api.get<Bed[]>(`/api/wards/${selectedWardId}/beds`),
    enabled: !!selectedWardId,
    refetchInterval: 30000,
  });

  const selectedWard = wards.find(w => w.id === selectedWardId);
  const available   = beds.filter(b => b.status === 1).length;
  const occupied    = beds.filter(b => b.status === 2).length;
  const maintenance = beds.filter(b => b.status === 3).length;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>Ward Board — แผงเตียงผู้ป่วย</Title>
        {selectedWardId && (
          <Button variant="light" size="xs" onClick={() => refetchBeds()}>รีเฟรช</Button>
        )}
      </Group>

      <Group gap="sm" align="flex-end">
        <Select
          label="เลือกหอผู้ป่วย"
          placeholder="เลือก Ward..."
          data={wards.map(w => ({ value: w.id, label: `${w.code} — ${w.name}` }))}
          value={selectedWardId}
          onChange={setSelectedWardId}
          style={{ minWidth: 280 }}
        />
        {selectedWard && (
          <Group gap="xs">
            <Badge color="green" variant="light">ว่าง {available}</Badge>
            <Badge color="red" variant="light">มีผู้ป่วย {occupied}</Badge>
            <Badge color="orange" variant="light">ซ่อม {maintenance}</Badge>
          </Group>
        )}
      </Group>

      {wardsLoading && <Text c="dimmed">กำลังโหลดรายชื่อหอผู้ป่วย...</Text>}

      {!selectedWardId && !wardsLoading && (
        <Paper withBorder p="xl">
          <Text ta="center" c="dimmed">เลือกหอผู้ป่วยเพื่อดูแผงเตียง</Text>
        </Paper>
      )}

      {selectedWardId && bedsLoading && <Text c="dimmed">กำลังโหลดข้อมูลเตียง...</Text>}

      {selectedWardId && !bedsLoading && (
        <Grid gutter="sm">
          {beds.map(bed => (
            <Grid.Col key={bed.id} span={{ base: 6, sm: 4, md: 3, lg: 2 }}>
              <Tooltip
                label={
                  bed.status === 2 ? (
                    <Stack gap={2}>
                      <Text size="xs" fw={600}>{bed.patientName}</Text>
                      <Text size="xs">HN: {bed.hn}</Text>
                      <Text size="xs">AN: {bed.encounterNo}</Text>
                    </Stack>
                  ) : BED_STATUS_LABEL[bed.status]
                }
                withArrow
                multiline
              >
                <Paper
                  withBorder
                  p="sm"
                  style={{
                    borderColor: `var(--mantine-color-${BED_STATUS_COLOR[bed.status]}-6)`,
                    background: bed.status === 2
                      ? 'var(--mantine-color-red-0)'
                      : bed.status === 3
                        ? 'var(--mantine-color-orange-0)'
                        : 'var(--mantine-color-green-0)',
                    minHeight: 80,
                  }}
                >
                  <Stack gap={2} align="center">
                    <Text fw={700} size="lg">{bed.bedNo}</Text>
                    <Badge size="xs" color={BED_STATUS_COLOR[bed.status]} variant="light">
                      {BED_STATUS_LABEL[bed.status]}
                    </Badge>
                    {bed.status === 2 && (
                      <Text size="xs" ta="center" c="dimmed" lineClamp={1}>
                        {bed.patientName}
                      </Text>
                    )}
                  </Stack>
                </Paper>
              </Tooltip>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
