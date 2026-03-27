// src/clients/apps/his/src/app/(main)/pharmacy/page.tsx
'use client';
import { useState } from 'react';
import {
  Badge, Button, Group, Paper, Stack, Table, Tabs, Text, Title, Alert,
  Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
type DrugOrderItem = {
  id: string; productId: string; productName: string; productCode: string;
  quantity: number; unit: string; dosage: string; frequency: string;
  pricePerUnit: number; totalPrice: number; status: number;
};
type DrugOrder = {
  id: string; orderNo: string; status: number;
  encounterId: string; encounterNo: string; hn: string; patientName: string;
  prescribedByName: string; prescribedDate: string;
  itemCount: number;
  items: DrugOrderItem[];
};
type DrugOrderListResponse = { items?: DrugOrder[] } | DrugOrder[];

const STATUS_LABEL: Record<number, string> = {
  1: 'รอตรวจสอบ', 2: 'ตรวจสอบแล้ว', 3: 'จ่ายยาแล้ว', 9: 'ยกเลิก',
};
const STATUS_COLOR: Record<number, string> = {
  1: 'yellow', 2: 'blue', 3: 'green', 9: 'red',
};

// ── Page ───────────────────────────────────────────────────────────────────
export default function PharmacyPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>('pending');
  const [selectedOrder, setSelectedOrder] = useState<DrugOrder | null>(null);
  const [detailOpen, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const statusFilter = activeTab === 'pending' ? 1 : activeTab === 'verified' ? 2 : 3;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['drug-orders', 'pharmacy', statusFilter],
    queryFn: () => api.get<DrugOrder[]>(`/api/drug-orders?status=${statusFilter}`),
    refetchInterval: 20000,
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/drug-orders/${id}/verify`),
    onSuccess: () => {
      setSuccessMsg('ตรวจสอบใบสั่งยาสำเร็จ');
      setErrorMsg('');
      closeDetail();
      qc.invalidateQueries({ queryKey: ['drug-orders', 'pharmacy'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const dispenseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/drug-orders/${id}/dispense`),
    onSuccess: () => {
      setSuccessMsg('จ่ายยาสำเร็จ');
      setErrorMsg('');
      closeDetail();
      qc.invalidateQueries({ queryKey: ['drug-orders', 'pharmacy'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/drug-orders/${id}/cancel`),
    onSuccess: () => {
      setSuccessMsg('ยกเลิกใบสั่งยาสำเร็จ');
      setErrorMsg('');
      closeDetail();
      qc.invalidateQueries({ queryKey: ['drug-orders', 'pharmacy'] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const handleSelectOrder = (order: DrugOrder) => {
    setSelectedOrder(order);
    setSuccessMsg('');
    setErrorMsg('');
    openDetail();
  };

  const orders = Array.isArray(data) ? data : (data as any)?.items ?? [];

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>ห้องยา (Pharmacy)</Title>
        <Button variant="light" size="xs" onClick={() => refetch()}>รีเฟรช</Button>
      </Group>

      {successMsg && <Alert color="green">{successMsg}</Alert>}
      {errorMsg && <Alert color="red">{errorMsg}</Alert>}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="pending">รอตรวจสอบ</Tabs.Tab>
          <Tabs.Tab value="verified">รอจ่ายยา</Tabs.Tab>
          <Tabs.Tab value="dispensed">จ่ายแล้ว</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>เลขที่ใบสั่งยา</Table.Th>
              <Table.Th>HN / ชื่อ</Table.Th>
              <Table.Th>VN</Table.Th>
              <Table.Th>รายการ</Table.Th>
              <Table.Th>สถานะ</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={6}><Text ta="center">กำลังโหลด...</Text></Table.Td>
              </Table.Tr>
            ) : orders.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}><Text ta="center" c="dimmed">ไม่มีรายการ</Text></Table.Td>
              </Table.Tr>
            ) : orders.map((order: DrugOrder) => (
              <Table.Tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectOrder(order)}>
                <Table.Td><Text fw={600} size="sm">{order.orderNo}</Text></Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{order.patientName}</Text>
                  <Text size="xs" c="dimmed">{order.hn}</Text>
                </Table.Td>
                <Table.Td><Text size="sm">{order.encounterNo}</Text></Table.Td>
                <Table.Td>
                  <Text size="sm">{order.itemCount ?? order.items?.length ?? '-'} รายการ</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLOR[order.status] ?? 'gray'} size="sm">
                    {STATUS_LABEL[order.status] ?? '-'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                    {order.status === 1 && (
                      <Button size="xs" color="blue"
                        loading={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(order.id)}>
                        ตรวจสอบ
                      </Button>
                    )}
                    {order.status === 2 && (
                      <Button size="xs" color="green"
                        loading={dispenseMutation.isPending}
                        onClick={() => dispenseMutation.mutate(order.id)}>
                        จ่ายยา
                      </Button>
                    )}
                    {order.status === 3 && (
                      <Button size="xs" variant="subtle" component="a"
                        href={`/print/drug-label/${order.id}`} target="_blank">
                        พิมพ์ฉลาก
                      </Button>
                    )}
                    {(order.status === 1 || order.status === 2) && (
                      <Button size="xs" variant="subtle" color="red"
                        loading={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(order.id)}>
                        ยกเลิก
                      </Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Detail Modal */}
      <Modal
        opened={detailOpen}
        onClose={closeDetail}
        title={selectedOrder ? `ใบสั่งยา ${selectedOrder.orderNo}` : 'รายละเอียด'}
        size="lg"
      >
        {selectedOrder && (
          <Stack gap="sm">
            <Group>
              <Stack gap={2} style={{ flex: 1 }}>
                <Text fw={600}>{selectedOrder.patientName}</Text>
                <Text size="sm" c="dimmed">HN: {selectedOrder.hn} | VN: {selectedOrder.encounterNo}</Text>
              </Stack>
              <Badge color={STATUS_COLOR[selectedOrder.status] ?? 'gray'}>
                {STATUS_LABEL[selectedOrder.status] ?? '-'}
              </Badge>
            </Group>

            <Paper withBorder>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ยา</Table.Th>
                    <Table.Th>วิธีใช้</Table.Th>
                    <Table.Th ta="right">จำนวน</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(selectedOrder.items ?? []).map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{item.productName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{item.frequency}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm">{item.quantity} {item.unit}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>

            {errorMsg && <Alert color="red">{errorMsg}</Alert>}

            <Group justify="flex-end">
              <Button variant="default" onClick={closeDetail}>ปิด</Button>
              {selectedOrder.status === 1 && (
                <Button color="blue"
                  loading={verifyMutation.isPending}
                  onClick={() => verifyMutation.mutate(selectedOrder.id)}>
                  ตรวจสอบใบสั่งยา
                </Button>
              )}
              {selectedOrder.status === 2 && (
                <Button color="green"
                  loading={dispenseMutation.isPending}
                  onClick={() => dispenseMutation.mutate(selectedOrder.id)}>
                  จ่ายยา
                </Button>
              )}
              {(selectedOrder.status === 1 || selectedOrder.status === 2) && (
                <Button variant="outline" color="red"
                  loading={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(selectedOrder.id)}>
                  ยกเลิกใบสั่งยา
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
