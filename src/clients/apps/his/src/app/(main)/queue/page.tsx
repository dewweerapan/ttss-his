// src/clients/apps/his/src/app/(main)/queue/page.tsx
'use client';
import { Badge, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
type QueueItem = {
  id: string; queueNo: string; status: number;
  encounterId: string; encounterNo: string; hn: string; patientName: string;
  chiefComplaint?: string;
  createdDate: string; calledAt?: string; servedAt?: string; doneAt?: string;
};
type QueueSummary = { waiting: number; called: number; serving: number; done: number };
type QueueListResponse = { items: QueueItem[]; summary: QueueSummary };

const DIVISION_ID = 'div-opd';

const STATUS_LABEL: Record<number, string> = {
  1: 'รอเรียก', 2: 'เรียกแล้ว', 3: 'กำลังตรวจ', 4: 'เสร็จ', 5: 'ข้าม',
};
const STATUS_COLOR: Record<number, string> = {
  1: 'yellow', 2: 'blue', 3: 'green', 4: 'gray', 5: 'red',
};

// ── Page ───────────────────────────────────────────────────────────────────
export default function QueuePage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['queue', DIVISION_ID],
    queryFn: () => api.get<QueueListResponse>(`/api/queue?divisionId=${DIVISION_ID}`),
    refetchInterval: 60000, // fallback polling every 60s
  });

  // ── SignalR real-time connection ───────────────────────────────────────
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiBase}/hubs/queue`, {
        accessTokenFactory: () => token ?? '',
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('QueueUpdated', () => {
      qc.invalidateQueries({ queryKey: ['queue'] });
    });

    connection.start()
      .then(() => connection.invoke('JoinDivision', DIVISION_ID))
      .catch(() => { /* silently fall back to polling */ });

    return () => {
      connection.stop();
    };
  }, [qc]);

  const callMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/queue/${id}/call`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  });
  const serveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/queue/${id}/serve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  });
  const doneMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/queue/${id}/done`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  });
  const skipMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/queue/${id}/skip`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  });

  const s = data?.summary;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>คิวผู้ป่วย OPD</Title>
        <Group>
          <Button variant="outline" size="xs" component="a" href="/queue/display" target="_blank">
            เปิดจอแสดงผล
          </Button>
          <Button variant="light" size="xs" onClick={() => qc.invalidateQueries({ queryKey: ['queue'] })}>
            รีเฟรช
          </Button>
        </Group>
      </Group>

      {/* Summary cards */}
      <SimpleGrid cols={4}>
        {[
          { label: 'รอเรียก', value: s?.waiting ?? 0, color: 'yellow' },
          { label: 'เรียกแล้ว', value: s?.called ?? 0, color: 'blue' },
          { label: 'กำลังตรวจ', value: s?.serving ?? 0, color: 'green' },
          { label: 'เสร็จแล้ว', value: s?.done ?? 0, color: 'gray' },
        ].map((c) => (
          <Paper key={c.label} withBorder p="md" ta="center">
            <Text size="xl" fw={700} c={c.color}>{c.value}</Text>
            <Text size="sm" c="dimmed">{c.label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Queue table */}
      <Paper withBorder>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>คิว</Table.Th>
              <Table.Th>HN</Table.Th>
              <Table.Th>ชื่อ-นามสกุล</Table.Th>
              <Table.Th>อาการ</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center">กำลังโหลด...</Text></Table.Td></Table.Tr>
            ) : (data?.items ?? []).length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีคิววันนี้</Text></Table.Td></Table.Tr>
            ) : (
              (data?.items ?? []).map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td><Text fw={700} size="lg">{item.queueNo}</Text></Table.Td>
                  <Table.Td>{item.hn}</Table.Td>
                  <Table.Td>{item.patientName}</Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{item.chiefComplaint ?? '-'}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLOR[item.status] ?? 'gray'}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {item.status === 1 && (
                        <Button size="xs" color="blue"
                          loading={callMutation.isPending}
                          onClick={() => callMutation.mutate(item.id)}>
                          เรียก
                        </Button>
                      )}
                      {item.status === 2 && (
                        <Button size="xs" color="green"
                          loading={serveMutation.isPending}
                          onClick={() => serveMutation.mutate(item.id)}>
                          เข้าห้องตรวจ
                        </Button>
                      )}
                      {item.status === 3 && (
                        <Button size="xs" color="gray"
                          loading={doneMutation.isPending}
                          onClick={() => doneMutation.mutate(item.id)}>
                          เสร็จ
                        </Button>
                      )}
                      {(item.status === 1 || item.status === 2) && (
                        <Button size="xs" variant="subtle" color="red"
                          loading={skipMutation.isPending}
                          onClick={() => skipMutation.mutate(item.id)}>
                          ข้าม
                        </Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
