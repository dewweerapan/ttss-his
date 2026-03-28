// src/clients/apps/his/src/app/(main)/claims/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, NumberInput, Paper, Stack,
  Table, Text, TextInput, Textarea, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Claim = {
  id: string; encounterId: string; patientName?: string; hn?: string;
  claimNo?: string; claimAmount: number; approvedAmount?: number;
  status: number; rejectionReason?: string; claimDate: string;
  submittedAt?: string; processedAt?: string; notes?: string;
};

const STATUS_LABEL: Record<number, string> = {
  1: 'Draft', 2: 'ยื่นแล้ว', 3: 'อนุมัติ', 4: 'ปฏิเสธ', 5: 'จ่ายแล้ว',
};
const STATUS_COLOR: Record<number, string> = {
  1: 'gray', 2: 'blue', 3: 'green', 4: 'red', 5: 'teal',
};

export default function ClaimsPage() {
  const qc = useQueryClient();
  const [rejectOpen, { open: openReject, close: closeReject }] = useDisclosure(false);
  const [selected, setSelected] = useState<Claim | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data: claims = [], refetch } = useQuery({
    queryKey: ['insurance-claims'],
    queryFn: () => api.get<Claim[]>('/api/insurance-claims'),
    refetchInterval: 60000,
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/insurance-claims/${id}/submit`, {}),
    onSuccess: () => { setSuccessMsg('ยื่นเคลมสำเร็จ'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.patch(`/api/insurance-claims/${id}/approve`, { approvedAmount: amount }),
    onSuccess: () => { setSuccessMsg('อนุมัติเคลมสำเร็จ'); refetch(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.patch(`/api/insurance-claims/${selected!.id}/reject`, { reason: rejectReason }),
    onSuccess: () => {
      setSuccessMsg('ปฏิเสธเคลมแล้ว'); setErrorMsg(''); closeReject(); refetch();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>การเรียกเก็บเงิน / เคลมประกัน (CLM)</Title>
        <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Paper withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ผู้ป่วย</Table.Th>
              <Table.Th>เลขที่เคลม</Table.Th>
              <Table.Th>ยอดเรียกเก็บ (฿)</Table.Th>
              <Table.Th>ยอดอนุมัติ (฿)</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {claims.length === 0 ? (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีรายการเคลม</Text></Table.Td></Table.Tr>
            ) : claims.map(c => (
              <Table.Tr key={c.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{c.patientName ?? '-'}</Text>
                  <Text size="xs" c="dimmed">{c.hn ?? '-'}</Text>
                </Table.Td>
                <Table.Td><Text size="sm">{c.claimNo ?? '-'}</Text></Table.Td>
                <Table.Td><Text size="sm">{c.claimAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text></Table.Td>
                <Table.Td><Text size="sm">{c.approvedAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) ?? '-'}</Text></Table.Td>
                <Table.Td>
                  <Badge size="sm" color={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  {c.rejectionReason && <Text size="xs" c="red">{c.rejectionReason}</Text>}
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {c.status === 1 && (
                      <Button size="xs" color="blue" variant="outline"
                        loading={submitMutation.isPending}
                        onClick={() => submitMutation.mutate(c.id)}>ยื่น</Button>
                    )}
                    {c.status === 2 && (
                      <Button size="xs" color="green" variant="outline"
                        loading={approveMutation.isPending}
                        onClick={() => approveMutation.mutate({ id: c.id, amount: c.claimAmount })}>อนุมัติ</Button>
                    )}
                    {c.status === 2 && (
                      <Button size="xs" color="red" variant="subtle"
                        onClick={() => { setSelected(c); setRejectReason(''); openReject(); }}>ปฏิเสธ</Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={rejectOpen} onClose={closeReject} title="ปฏิเสธการเรียกเก็บ">
        <Stack gap="sm">
          <TextInput label="เหตุผลการปฏิเสธ" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeReject}>ยกเลิก</Button>
            <Button color="red" loading={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>ยืนยัน</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
