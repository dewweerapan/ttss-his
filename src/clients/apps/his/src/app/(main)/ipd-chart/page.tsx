// src/clients/apps/his/src/app/(main)/ipd-chart/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, Paper, Select, Stack,
  Table, Tabs, Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type IpdEncounter = {
  encounterId: string; encounterNo: string; hn: string; patientName: string;
  bedNumber?: string; status: number; admissionDate: string;
};
type NursingNote = {
  id: string; encounterId: string; noteType: number; content: string;
  recordedBy?: string; recordedDate: string;
};
type DoctorOrder = {
  id: string; encounterId: string; orderType: number; orderContent: string;
  doctorId?: string; status: number; orderDate: string; completedAt?: string; notes?: string;
};

const NOTE_TYPE_LABEL: Record<number, string> = {
  1: 'Assessment', 2: 'Intervention', 3: 'Evaluation', 4: 'Progress Note',
};
const NOTE_TYPE_COLOR: Record<number, string> = {
  1: 'blue', 2: 'orange', 3: 'green', 4: 'gray',
};
const ORDER_TYPE_LABEL: Record<number, string> = {
  1: 'ยา', 2: 'อาหาร', 3: 'กิจกรรม', 4: 'การตรวจ', 5: 'หัตถการ', 9: 'อื่นๆ',
};
const ORDER_STATUS_LABEL: Record<number, string> = { 1: 'Active', 2: 'เสร็จสิ้น', 9: 'ยกเลิก' };
const ORDER_STATUS_COLOR: Record<number, string> = { 1: 'blue', 2: 'green', 9: 'red' };

export default function IpdChartPage() {
  const qc = useQueryClient();

  const [selectedEncounter, setSelectedEncounter] = useState<IpdEncounter | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('notes');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [noteOpen, { open: openNote, close: closeNote }] = useDisclosure(false);
  const [noteType, setNoteType] = useState<string | null>('4');
  const [noteContent, setNoteContent] = useState('');
  const [noteRecordedBy, setNoteRecordedBy] = useState('');

  const [orderOpen, { open: openOrder, close: closeOrder }] = useDisclosure(false);
  const [orderType, setOrderType] = useState<string | null>('9');
  const [orderContent, setOrderContent] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const { data: encounters = [], refetch: refetchEncounters } = useQuery({
    queryKey: ['admissions'],
    queryFn: () => api.get<IpdEncounter[]>('/api/admissions'),
    refetchInterval: 60000,
  });

  const { data: nursingNotes = [], refetch: refetchNotes } = useQuery({
    queryKey: ['nursing-notes', selectedEncounter?.encounterId],
    queryFn: () => api.get<NursingNote[]>(`/api/encounters/${selectedEncounter!.encounterId}/nursing-notes`),
    enabled: !!selectedEncounter,
  });

  const { data: doctorOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['doctor-orders-ipd', selectedEncounter?.encounterId],
    queryFn: () => api.get<DoctorOrder[]>(`/api/encounters/${selectedEncounter!.encounterId}/doctor-orders`),
    enabled: !!selectedEncounter,
  });

  const addNoteMutation = useMutation({
    mutationFn: () => api.post(`/api/encounters/${selectedEncounter!.encounterId}/nursing-notes`, {
      noteType: Number(noteType),
      content: noteContent,
      recordedBy: noteRecordedBy || null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกการพยาบาลสำเร็จ');
      setErrorMsg('');
      closeNote();
      setNoteContent('');
      refetchNotes();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.delete(`/api/nursing-notes/${noteId}`),
    onSuccess: () => { setSuccessMsg('ลบบันทึกสำเร็จ'); refetchNotes(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const addOrderMutation = useMutation({
    mutationFn: () => api.post(`/api/encounters/${selectedEncounter!.encounterId}/doctor-orders`, {
      orderType: Number(orderType),
      orderContent,
      doctorId: null,
      notes: orderNotes || null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกคำสั่งแพทย์สำเร็จ');
      setErrorMsg('');
      closeOrder();
      setOrderContent('');
      setOrderNotes('');
      refetchOrders();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const completeOrderMutation = useMutation({
    mutationFn: (orderId: string) => api.patch(`/api/doctor-orders/${orderId}/complete`, {}),
    onSuccess: () => { setSuccessMsg('ทำเครื่องหมายเสร็จสิ้นแล้ว'); refetchOrders(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string) => api.patch(`/api/doctor-orders/${orderId}/cancel`, {}),
    onSuccess: () => { setSuccessMsg('ยกเลิกคำสั่งแล้ว'); refetchOrders(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={3}>IPD Chart — บันทึกการพยาบาล & คำสั่งแพทย์</Title>
        <Button variant="light" size="xs" onClick={() => refetchEncounters()}>รีเฟรช</Button>
      </Group>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 300, flexShrink: 0 }}>
          <Paper withBorder>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ผู้ป่วย</Table.Th>
                  <Table.Th>เตียง</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {encounters.length === 0 ? (
                  <Table.Tr><Table.Td colSpan={2}><Text ta="center" c="dimmed">ไม่มีผู้ป่วยใน</Text></Table.Td></Table.Tr>
                ) : encounters.map(enc => (
                  <Table.Tr
                    key={enc.encounterId}
                    onClick={() => { setSelectedEncounter(enc); setActiveTab('notes'); }}
                    style={{ cursor: 'pointer', background: selectedEncounter?.encounterId === enc.encounterId ? '#e8f4fd' : undefined }}
                  >
                    <Table.Td>
                      <Text size="sm" fw={500}>{enc.patientName}</Text>
                      <Text size="xs" c="dimmed">{enc.hn}</Text>
                    </Table.Td>
                    <Table.Td><Text size="sm">{enc.bedNumber ?? '-'}</Text></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </div>

        <div style={{ flex: 1 }}>
          {!selectedEncounter ? (
            <Paper withBorder p="xl">
              <Text ta="center" c="dimmed">เลือกผู้ป่วยจากรายชื่อด้านซ้าย</Text>
            </Paper>
          ) : (
            <Stack gap="sm">
              <Paper withBorder p="sm">
                <Text fw={600}>{selectedEncounter.patientName}</Text>
                <Text size="sm" c="dimmed">
                  HN: {selectedEncounter.hn} | AN: {selectedEncounter.encounterNo} | เตียง: {selectedEncounter.bedNumber ?? '-'}
                </Text>
              </Paper>

              <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                  <Tabs.Tab value="notes">บันทึกการพยาบาล ({nursingNotes.length})</Tabs.Tab>
                  <Tabs.Tab value="orders">คำสั่งแพทย์ ({doctorOrders.length})</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="notes" pt="sm">
                  <Stack gap="sm">
                    <Group justify="flex-end">
                      <Button size="sm" onClick={() => { setNoteType('4'); setNoteContent(''); setNoteRecordedBy(''); openNote(); }}>
                        + เพิ่มบันทึก
                      </Button>
                    </Group>
                    {nursingNotes.length === 0 ? (
                      <Text ta="center" c="dimmed" py="lg">ยังไม่มีบันทึกการพยาบาล</Text>
                    ) : nursingNotes.map(note => (
                      <Paper key={note.id} withBorder p="sm">
                        <Group justify="space-between" mb={4}>
                          <Badge color={NOTE_TYPE_COLOR[note.noteType]} size="sm">
                            {NOTE_TYPE_LABEL[note.noteType]}
                          </Badge>
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">
                              {note.recordedBy ?? 'ไม่ระบุ'} — {new Date(note.recordedDate).toLocaleString('th-TH')}
                            </Text>
                            <Button size="xs" variant="subtle" color="red"
                              loading={deleteNoteMutation.isPending}
                              onClick={() => deleteNoteMutation.mutate(note.id)}>
                              ลบ
                            </Button>
                          </Group>
                        </Group>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{note.content}</Text>
                      </Paper>
                    ))}
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="orders" pt="sm">
                  <Stack gap="sm">
                    <Group justify="flex-end">
                      <Button size="sm" onClick={() => { setOrderType('9'); setOrderContent(''); setOrderNotes(''); openOrder(); }}>
                        + เพิ่มคำสั่งแพทย์
                      </Button>
                    </Group>
                    {doctorOrders.length === 0 ? (
                      <Text ta="center" c="dimmed" py="lg">ยังไม่มีคำสั่งแพทย์</Text>
                    ) : (
                      <Paper withBorder>
                        <Table>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>ประเภท</Table.Th>
                              <Table.Th>คำสั่ง</Table.Th>
                              <Table.Th>สถานะ</Table.Th>
                              <Table.Th>วันที่</Table.Th>
                              <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {doctorOrders.map(order => (
                              <Table.Tr key={order.id}>
                                <Table.Td>
                                  <Badge size="sm" variant="light">{ORDER_TYPE_LABEL[order.orderType] ?? '-'}</Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">{order.orderContent}</Text>
                                  {order.notes && <Text size="xs" c="dimmed">{order.notes}</Text>}
                                </Table.Td>
                                <Table.Td>
                                  <Badge size="sm" color={ORDER_STATUS_COLOR[order.status]}>
                                    {ORDER_STATUS_LABEL[order.status]}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="xs">{new Date(order.orderDate).toLocaleDateString('th-TH')}</Text>
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs">
                                    {order.status === 1 && (
                                      <Button size="xs" color="green" variant="outline"
                                        loading={completeOrderMutation.isPending}
                                        onClick={() => completeOrderMutation.mutate(order.id)}>
                                        เสร็จ
                                      </Button>
                                    )}
                                    {order.status === 1 && (
                                      <Button size="xs" color="red" variant="subtle"
                                        loading={cancelOrderMutation.isPending}
                                        onClick={() => cancelOrderMutation.mutate(order.id)}>
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
                    )}
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </Stack>
          )}
        </div>
      </div>

      {/* Add Nursing Note Modal */}
      <Modal opened={noteOpen} onClose={closeNote} title="เพิ่มบันทึกการพยาบาล">
        <Stack gap="sm">
          <Select
            label="ประเภทบันทึก"
            data={[
              { value: '1', label: 'Assessment' },
              { value: '2', label: 'Intervention' },
              { value: '3', label: 'Evaluation' },
              { value: '4', label: 'Progress Note' },
            ]}
            value={noteType}
            onChange={setNoteType}
          />
          <Textarea
            label="บันทึก"
            placeholder="ระบุรายละเอียด..."
            rows={5}
            value={noteContent}
            onChange={e => setNoteContent(e.target.value)}
          />
          <TextInput
            label="บันทึกโดย (ชื่อพยาบาล)"
            value={noteRecordedBy}
            onChange={e => setNoteRecordedBy(e.target.value)}
            placeholder="ชื่อผู้บันทึก (ถ้ามี)"
          />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeNote}>ยกเลิก</Button>
            <Button color="blue" loading={addNoteMutation.isPending}
              disabled={!noteContent.trim()} onClick={() => addNoteMutation.mutate()}>
              บันทึก
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Doctor Order Modal */}
      <Modal opened={orderOpen} onClose={closeOrder} title="เพิ่มคำสั่งแพทย์">
        <Stack gap="sm">
          <Select
            label="ประเภทคำสั่ง"
            data={[
              { value: '1', label: 'ยา (Medication)' },
              { value: '2', label: 'อาหาร (Diet)' },
              { value: '3', label: 'กิจกรรม (Activity)' },
              { value: '4', label: 'การตรวจ (Investigation)' },
              { value: '5', label: 'หัตถการ (Procedure)' },
              { value: '9', label: 'อื่นๆ' },
            ]}
            value={orderType}
            onChange={setOrderType}
          />
          <Textarea
            label="คำสั่ง"
            placeholder="ระบุคำสั่งแพทย์..."
            rows={3}
            value={orderContent}
            onChange={e => setOrderContent(e.target.value)}
          />
          <TextInput
            label="หมายเหตุ"
            value={orderNotes}
            onChange={e => setOrderNotes(e.target.value)}
            placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
          />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeOrder}>ยกเลิก</Button>
            <Button color="blue" loading={addOrderMutation.isPending}
              disabled={!orderContent.trim()} onClick={() => addOrderMutation.mutate()}>
              บันทึก
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
