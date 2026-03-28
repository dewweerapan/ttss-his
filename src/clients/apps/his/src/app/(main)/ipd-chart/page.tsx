// src/clients/apps/his/src/app/(main)/ipd-chart/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Modal, NumberInput, Paper, Select, Stack,
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
type DietOrder = {
  id: string; encounterId: string; dietType: number; meal: number;
  notes?: string; status: number; orderDate: string; orderedBy?: string;
};
type SupplyRequest = {
  id: string; encounterId: string; itemName: string; quantity: number;
  notes?: string; status: number; requestDate: string; requestedBy?: string; dispensedAt?: string;
};

const DIET_TYPE_LABEL: Record<number, string> = {
  1: 'อาหารปกติ', 2: 'อาหารอ่อน', 3: 'อาหารเหลว', 4: 'เบาหวาน', 5: 'ลดเค็ม', 9: 'อื่นๆ',
};
const MEAL_LABEL: Record<number, string> = {
  1: 'ทุกมื้อ', 2: 'เช้า', 3: 'กลางวัน', 4: 'เย็น',
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

  const [dietOpen, { open: openDiet, close: closeDiet }] = useDisclosure(false);
  const [dietType, setDietType] = useState<string | null>('1');
  const [dietMeal, setDietMeal] = useState<string | null>('1');
  const [dietNotes, setDietNotes] = useState('');
  const [dietOrderedBy, setDietOrderedBy] = useState('');

  const [supplyOpen, { open: openSupply, close: closeSupply }] = useDisclosure(false);
  const [supplyItem, setSupplyItem] = useState('');
  const [supplyQty, setSupplyQty] = useState<number | string>(1);
  const [supplyNotes, setSupplyNotes] = useState('');
  const [supplyReqBy, setSupplyReqBy] = useState('');

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

  const { data: dietOrders = [], refetch: refetchDiet } = useQuery({
    queryKey: ['diet-orders', selectedEncounter?.encounterId],
    queryFn: () => api.get<DietOrder[]>(`/api/encounters/${selectedEncounter!.encounterId}/diet-orders`),
    enabled: !!selectedEncounter,
  });

  const { data: supplyRequests = [], refetch: refetchSupply } = useQuery({
    queryKey: ['supply-requests', selectedEncounter?.encounterId],
    queryFn: () => api.get<SupplyRequest[]>(`/api/encounters/${selectedEncounter!.encounterId}/supply-requests`),
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

  const addDietMutation = useMutation({
    mutationFn: () => api.post(`/api/encounters/${selectedEncounter!.encounterId}/diet-orders`, {
      dietType: Number(dietType), meal: Number(dietMeal),
      notes: dietNotes || null, orderedBy: dietOrderedBy || null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกคำสั่งอาหารสำเร็จ'); setErrorMsg('');
      closeDiet(); setDietNotes(''); setDietOrderedBy(''); refetchDiet();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const cancelDietMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/diet-orders/${id}/cancel`, {}),
    onSuccess: () => { setSuccessMsg('ยกเลิกคำสั่งอาหารแล้ว'); refetchDiet(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const addSupplyMutation = useMutation({
    mutationFn: () => api.post(`/api/encounters/${selectedEncounter!.encounterId}/supply-requests`, {
      itemName: supplyItem, productId: null,
      quantity: Number(supplyQty), notes: supplyNotes || null, requestedBy: supplyReqBy || null,
    }),
    onSuccess: () => {
      setSuccessMsg('บันทึกคำขอเวชภัณฑ์สำเร็จ'); setErrorMsg('');
      closeSupply(); setSupplyItem(''); setSupplyQty(1); setSupplyNotes(''); setSupplyReqBy('');
      refetchSupply();
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const dispenseSupplyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/supply-requests/${id}/dispense`, { dispensedBy: null }),
    onSuccess: () => { setSuccessMsg('จ่ายเวชภัณฑ์สำเร็จ'); refetchSupply(); },
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
                  <Tabs.Tab value="diet">อาหาร ({dietOrders.length})</Tabs.Tab>
                  <Tabs.Tab value="supply">เวชภัณฑ์ ({supplyRequests.length})</Tabs.Tab>
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

                {/* Diet Orders Tab */}
                <Tabs.Panel value="diet" pt="sm">
                  <Stack gap="sm">
                    <Group justify="flex-end">
                      <Button size="sm" onClick={() => { setDietType('1'); setDietMeal('1'); setDietNotes(''); setDietOrderedBy(''); openDiet(); }}>
                        + สั่งอาหาร
                      </Button>
                    </Group>
                    {dietOrders.length === 0 ? (
                      <Text ta="center" c="dimmed" py="lg">ยังไม่มีคำสั่งอาหาร</Text>
                    ) : (
                      <Paper withBorder>
                        <Table>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>ประเภทอาหาร</Table.Th>
                              <Table.Th>มื้อ</Table.Th>
                              <Table.Th>สถานะ</Table.Th>
                              <Table.Th>วันที่</Table.Th>
                              <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {dietOrders.map(d => (
                              <Table.Tr key={d.id}>
                                <Table.Td>
                                  <Text size="sm">{DIET_TYPE_LABEL[d.dietType] ?? '-'}</Text>
                                  {d.notes && <Text size="xs" c="dimmed">{d.notes}</Text>}
                                </Table.Td>
                                <Table.Td><Text size="sm">{MEAL_LABEL[d.meal] ?? '-'}</Text></Table.Td>
                                <Table.Td>
                                  <Badge size="sm" color={d.status === 1 ? 'green' : 'red'}>
                                    {d.status === 1 ? 'Active' : 'ยกเลิก'}
                                  </Badge>
                                </Table.Td>
                                <Table.Td><Text size="xs">{new Date(d.orderDate).toLocaleDateString('th-TH')}</Text></Table.Td>
                                <Table.Td>
                                  {d.status === 1 && (
                                    <Button size="xs" color="red" variant="subtle"
                                      loading={cancelDietMutation.isPending}
                                      onClick={() => cancelDietMutation.mutate(d.id)}>
                                      ยกเลิก
                                    </Button>
                                  )}
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </Paper>
                    )}
                  </Stack>
                </Tabs.Panel>

                {/* Supply Requests Tab */}
                <Tabs.Panel value="supply" pt="sm">
                  <Stack gap="sm">
                    <Group justify="flex-end">
                      <Button size="sm" onClick={() => { setSupplyItem(''); setSupplyQty(1); setSupplyNotes(''); setSupplyReqBy(''); openSupply(); }}>
                        + ขอเวชภัณฑ์
                      </Button>
                    </Group>
                    {supplyRequests.length === 0 ? (
                      <Text ta="center" c="dimmed" py="lg">ยังไม่มีคำขอเวชภัณฑ์</Text>
                    ) : (
                      <Paper withBorder>
                        <Table>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>รายการ</Table.Th>
                              <Table.Th>จำนวน</Table.Th>
                              <Table.Th>สถานะ</Table.Th>
                              <Table.Th>วันที่</Table.Th>
                              <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {supplyRequests.map(s => (
                              <Table.Tr key={s.id}>
                                <Table.Td>
                                  <Text size="sm">{s.itemName}</Text>
                                  {s.notes && <Text size="xs" c="dimmed">{s.notes}</Text>}
                                </Table.Td>
                                <Table.Td><Text size="sm">{s.quantity}</Text></Table.Td>
                                <Table.Td>
                                  <Badge size="sm" color={s.status === 1 ? 'orange' : s.status === 2 ? 'green' : 'red'}>
                                    {s.status === 1 ? 'รอจ่าย' : s.status === 2 ? 'จ่ายแล้ว' : 'ยกเลิก'}
                                  </Badge>
                                </Table.Td>
                                <Table.Td><Text size="xs">{new Date(s.requestDate).toLocaleDateString('th-TH')}</Text></Table.Td>
                                <Table.Td>
                                  {s.status === 1 && (
                                    <Button size="xs" color="green" variant="outline"
                                      loading={dispenseSupplyMutation.isPending}
                                      onClick={() => dispenseSupplyMutation.mutate(s.id)}>
                                      จ่าย
                                    </Button>
                                  )}
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

      {/* Diet Order Modal */}
      <Modal opened={dietOpen} onClose={closeDiet} title="สั่งอาหาร">
        <Stack gap="sm">
          <Select
            label="ประเภทอาหาร"
            data={[
              { value: '1', label: 'อาหารปกติ' }, { value: '2', label: 'อาหารอ่อน' },
              { value: '3', label: 'อาหารเหลว' }, { value: '4', label: 'เบาหวาน' },
              { value: '5', label: 'ลดเค็ม' }, { value: '9', label: 'อื่นๆ' },
            ]}
            value={dietType} onChange={setDietType}
          />
          <Select
            label="มื้ออาหาร"
            data={[
              { value: '1', label: 'ทุกมื้อ' }, { value: '2', label: 'เช้า' },
              { value: '3', label: 'กลางวัน' }, { value: '4', label: 'เย็น' },
            ]}
            value={dietMeal} onChange={setDietMeal}
          />
          <TextInput label="หมายเหตุ" value={dietNotes} onChange={e => setDietNotes(e.target.value)} placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)" />
          <TextInput label="สั่งโดย" value={dietOrderedBy} onChange={e => setDietOrderedBy(e.target.value)} placeholder="ชื่อแพทย์/พยาบาล" />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDiet}>ยกเลิก</Button>
            <Button color="green" loading={addDietMutation.isPending} onClick={() => addDietMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Supply Request Modal */}
      <Modal opened={supplyOpen} onClose={closeSupply} title="ขอเวชภัณฑ์">
        <Stack gap="sm">
          <TextInput label="รายการ" value={supplyItem} onChange={e => setSupplyItem(e.target.value)} placeholder="ชื่อยา/เวชภัณฑ์/อุปกรณ์" required />
          <NumberInput label="จำนวน" value={supplyQty} onChange={setSupplyQty} min={1} max={999} />
          <TextInput label="หมายเหตุ" value={supplyNotes} onChange={e => setSupplyNotes(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)" />
          <TextInput label="ขอโดย" value={supplyReqBy} onChange={e => setSupplyReqBy(e.target.value)} placeholder="ชื่อพยาบาล/ผู้ขอ" />
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeSupply}>ยกเลิก</Button>
            <Button color="blue" loading={addSupplyMutation.isPending}
              disabled={!supplyItem.trim()} onClick={() => addSupplyMutation.mutate()}>บันทึก</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
