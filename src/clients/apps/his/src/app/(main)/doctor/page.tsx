// src/clients/apps/his/src/app/(main)/doctor/page.tsx
'use client';
import { useState } from 'react';
import {
  ActionIcon, Badge, Button, Divider, Grid, Group, NumberInput,
  Paper, Select, Stack, Table, Tabs, Text, TextInput, Textarea, Title, Alert,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
type EncounterItem = {
  id: string; encounterNo: string; hn: string; patientName: string;
  status: number; chiefComplaint?: string; queueNo?: string; queueStatus?: number;
  doctorId?: string;
};
type VitalSignInfo = {
  temperature?: number; pulseRate?: number; respiratoryRate?: number;
  bpSystolic?: number; bpDiastolic?: number; o2Sat?: number;
  weight?: number; height?: number;
};
type DiagnosisInfo = { id: string; type: number; icd10Code?: string; icd10Name?: string; description?: string; isConfirmed: boolean; };
type DrugOrderLineItem = { id: string; productName: string; quantity: number; frequency: string; durationDays: number; instruction?: string; unit?: string; };
type DrugOrderSummary = { id: string; orderNo: string; status: number; orderDate: string; items: DrugOrderLineItem[]; };
type EncounterDetail = {
  id: string; encounterNo: string; status: number; chiefComplaint?: string;
  doctorId?: string; patient: { id: string; hn: string; preName?: string; firstName: string; lastName: string; birthdate?: string; phoneNumber?: string; };
  latestVitals?: VitalSignInfo;
  queueItem?: { id: string; queueNo: string; status: number; };
  diagnoses: DiagnosisInfo[];
};
type Icd10Item = { id: string; code: string; name: string; nameEn?: string; };
type ProductItem = { id: string; code: string; name: string; unit?: string; };
type DoctorItem = { id: string; preName?: string; firstName: string; lastName: string; specialty?: string; };

const DIAG_TYPE_OPTIONS = [
  { value: '1', label: 'Principal Diagnosis' },
  { value: '2', label: 'Comorbidity' },
  { value: '3', label: 'Complication' },
  { value: '4', label: 'Rule Out' },
];
const FREQUENCY_OPTIONS = ['OD', 'BID', 'TID', 'QID', 'PRN', 'STAT'].map(f => ({ value: f, label: f }));

// ── Page ───────────────────────────────────────────────────────────────────
export default function DoctorPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Diagnosis form
  const [icd10Search, setIcd10Search] = useState('');
  const [selectedIcd10, setSelectedIcd10] = useState<Icd10Item | null>(null);
  const [diagType, setDiagType] = useState<string>('1');
  const [diagDesc, setDiagDesc] = useState('');

  // Drug order form
  const [drugSearch, setDrugSearch] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<ProductItem | null>(null);
  const [drugQty, setDrugQty] = useState<number | string>(1);
  const [drugFreq, setDrugFreq] = useState<string | null>('OD');
  const [drugDays, setDrugDays] = useState<number | string>(7);
  const [drugInstruction, setDrugInstruction] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Queries
  const { data: listData, isLoading } = useQuery({
    queryKey: ['encounters', 'doctor'],
    queryFn: () => api.get<{ items: EncounterItem[] }>('/api/encounters?status=1'),
    refetchInterval: 30000,
  });

  const { data: detail } = useQuery({
    queryKey: ['encounter', selectedId],
    queryFn: () => api.get<EncounterDetail>(`/api/encounters/${selectedId}`),
    enabled: !!selectedId,
  });

  const { data: drugOrders } = useQuery({
    queryKey: ['drug-orders', selectedId],
    queryFn: () => api.get<DrugOrderSummary[]>(`/api/encounters/${selectedId}/drug-orders`),
    enabled: !!selectedId,
  });

  const { data: icd10Results } = useQuery({
    queryKey: ['icd10', icd10Search],
    queryFn: () => api.get<Icd10Item[]>(`/api/masterdata/icd10?search=${encodeURIComponent(icd10Search)}`),
    enabled: icd10Search.length >= 2,
  });

  const { data: drugResults } = useQuery({
    queryKey: ['drugs', drugSearch],
    queryFn: () => api.get<ProductItem[]>(`/api/masterdata/products?type=1&search=${encodeURIComponent(drugSearch)}`),
    enabled: drugSearch.length >= 2,
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get<DoctorItem[]>('/api/masterdata/doctors'),
  });

  // Mutations
  const consultMutation = useMutation({
    mutationFn: (doctorId: string) => api.patch(`/api/encounters/${selectedId}/consult`, { doctorId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['encounter', selectedId] }); setSuccessMsg('กำหนดแพทย์แล้ว'); },
  });

  const addDiagMutation = useMutation({
    mutationFn: (body: object) => api.post(`/api/encounters/${selectedId}/diagnoses`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['encounter', selectedId] });
      setSelectedIcd10(null); setIcd10Search(''); setDiagDesc(''); setDiagType('1');
      setSuccessMsg('เพิ่มการวินิจฉัยแล้ว');
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const removeDiagMutation = useMutation({
    mutationFn: (diagId: string) => api.delete(`/api/encounters/${selectedId}/diagnoses/${diagId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['encounter', selectedId] }),
  });

  const createOrderMutation = useMutation({
    mutationFn: (body: object) => api.post(`/api/encounters/${selectedId}/drug-orders`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drug-orders', selectedId] });
      setSelectedDrug(null); setDrugSearch(''); setDrugQty(1); setDrugFreq('OD'); setDrugDays(7); setDrugInstruction('');
      setSuccessMsg('สั่งยาแล้ว');
    },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const handleAddDrug = () => {
    if (!selectedDrug) return;
    createOrderMutation.mutate({
      items: [{
        productId: selectedDrug.id,
        quantity: Number(drugQty),
        frequency: drugFreq ?? 'OD',
        durationDays: Number(drugDays),
        instruction: drugInstruction || undefined,
        unit: selectedDrug.unit,
      }],
    });
  };

  const v = detail?.latestVitals;
  const doctorOptions = (doctors ?? []).map(d => ({
    value: d.id,
    label: `${d.preName ?? ''}${d.firstName} ${d.lastName}`,
  }));

  return (
    <Grid gutter="md">
      {/* Left panel: encounter list */}
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack gap="sm">
          <Title order={4}>รายชื่อผู้ป่วยวันนี้</Title>
          <Paper withBorder>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>คิว / HN</Table.Th>
                  <Table.Th>ชื่อ / อาการ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading
                  ? <Table.Tr><Table.Td colSpan={2}><Text ta="center">กำลังโหลด...</Text></Table.Td></Table.Tr>
                  : (listData?.items ?? []).map((enc) => (
                    <Table.Tr
                      key={enc.id}
                      onClick={() => { setSelectedId(enc.id); setSuccessMsg(''); setErrorMsg(''); }}
                      style={{ cursor: 'pointer', background: selectedId === enc.id ? '#e8f4fd' : undefined }}
                    >
                      <Table.Td>
                        <Text fw={700} size="sm">{enc.queueNo ?? '-'}</Text>
                        <Text size="xs" c="dimmed">{enc.hn}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{enc.patientName}</Text>
                        <Text size="xs" c="dimmed">{enc.chiefComplaint ?? '-'}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>
      </Grid.Col>

      {/* Right panel: consultation */}
      <Grid.Col span={{ base: 12, md: 8 }}>
        {!selectedId ? (
          <Paper withBorder p="xl"><Text ta="center" c="dimmed">เลือกผู้ป่วยจากรายชื่อ</Text></Paper>
        ) : (
          <Stack gap="sm">
            {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
            {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

            {/* Patient header */}
            {detail && (
              <Paper withBorder p="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2}>
                    <Text fw={700}>{(detail.patient.preName ?? '') + detail.patient.firstName + ' ' + detail.patient.lastName}</Text>
                    <Text size="sm" c="dimmed">HN: {detail.patient.hn} | VN: {detail.encounterNo}</Text>
                  </Stack>
                  <Select
                    placeholder="กำหนดแพทย์"
                    data={doctorOptions}
                    value={detail.doctorId ?? null}
                    onChange={(v) => v && consultMutation.mutate(v)}
                    size="sm"
                    style={{ minWidth: 200 }}
                  />
                </Group>
              </Paper>
            )}

            <Tabs defaultValue="info">
              <Tabs.List>
                <Tabs.Tab value="info">ข้อมูลผู้ป่วย</Tabs.Tab>
                <Tabs.Tab value="diagnosis">วินิจฉัย ({detail?.diagnoses.length ?? 0})</Tabs.Tab>
                <Tabs.Tab value="drugs">สั่งยา ({drugOrders?.length ?? 0})</Tabs.Tab>
              </Tabs.List>

              {/* Tab 1: Patient info + vitals */}
              <Tabs.Panel value="info" pt="sm">
                {detail && v ? (
                  <Paper withBorder p="md">
                    <Text fw={600} mb="xs">สัญญาณชีพล่าสุด</Text>
                    <Grid>
                      {[
                        ['อุณหภูมิ', v.temperature ? `${v.temperature}°C` : '-'],
                        ['ชีพจร', v.pulseRate ? `${v.pulseRate} ครั้ง/นาที` : '-'],
                        ['การหายใจ', v.respiratoryRate ? `${v.respiratoryRate} ครั้ง/นาที` : '-'],
                        ['BP', (v.bpSystolic && v.bpDiastolic) ? `${v.bpSystolic}/${v.bpDiastolic} mmHg` : '-'],
                        ['O2 Sat', v.o2Sat ? `${v.o2Sat}%` : '-'],
                        ['น้ำหนัก', v.weight ? `${v.weight} กก.` : '-'],
                        ['ส่วนสูง', v.height ? `${v.height} ซม.` : '-'],
                      ].map(([label, value]) => (
                        <Grid.Col span={6} key={label as string}>
                          <Text size="sm"><Text span c="dimmed">{label}: </Text>{value}</Text>
                        </Grid.Col>
                      ))}
                    </Grid>
                    {detail.chiefComplaint && (
                      <><Divider my="xs" /><Text size="sm"><Text span fw={600}>อาการสำคัญ: </Text>{detail.chiefComplaint}</Text></>
                    )}
                  </Paper>
                ) : (
                  <Text c="dimmed" size="sm">ยังไม่มีการบันทึกสัญญาณชีพ</Text>
                )}
              </Tabs.Panel>

              {/* Tab 2: Diagnoses */}
              <Tabs.Panel value="diagnosis" pt="sm">
                <Stack gap="sm">
                  {(detail?.diagnoses ?? []).map((d) => (
                    <Paper key={d.id} withBorder p="sm">
                      <Group justify="space-between">
                        <Stack gap={2}>
                          <Group gap="xs">
                            <Badge size="sm" variant="light">{DIAG_TYPE_OPTIONS.find(o => o.value === String(d.type))?.label ?? d.type}</Badge>
                            {d.icd10Code && <Text size="sm" fw={600}>{d.icd10Code}</Text>}
                          </Group>
                          <Text size="sm">{d.icd10Name ?? d.description ?? '-'}</Text>
                        </Stack>
                        <ActionIcon color="red" variant="subtle" size="sm"
                          onClick={() => removeDiagMutation.mutate(d.id)}>✕</ActionIcon>
                      </Group>
                    </Paper>
                  ))}

                  <Divider label="เพิ่มการวินิจฉัย" />

                  <TextInput
                    label="ค้นหา ICD-10"
                    placeholder="เช่น J00, ไข้หวัด"
                    value={icd10Search}
                    onChange={(e) => setIcd10Search(e.target.value)}
                  />
                  {(icd10Results ?? []).length > 0 && !selectedIcd10 && (
                    <Paper withBorder p="xs">
                      {(icd10Results ?? []).map((item) => (
                        <Text
                          key={item.id} size="sm" p="xs"
                          style={{ cursor: 'pointer' }}
                          onClick={() => { setSelectedIcd10(item); setIcd10Search(item.code + ' ' + item.name); }}
                        >
                          <strong>{item.code}</strong> — {item.name}
                        </Text>
                      ))}
                    </Paper>
                  )}
                  <Select label="ประเภทการวินิจฉัย" data={DIAG_TYPE_OPTIONS} value={diagType} onChange={(v) => setDiagType(v ?? '1')} />
                  <Textarea label="หมายเหตุ" value={diagDesc} onChange={(e) => setDiagDesc(e.target.value)} rows={2} />
                  <Button
                    onClick={() => addDiagMutation.mutate({ icd10Id: selectedIcd10?.id, type: Number(diagType), description: diagDesc || undefined })}
                    loading={addDiagMutation.isPending}
                    disabled={!selectedIcd10}
                  >
                    เพิ่มการวินิจฉัย
                  </Button>
                </Stack>
              </Tabs.Panel>

              {/* Tab 3: Drug orders */}
              <Tabs.Panel value="drugs" pt="sm">
                <Stack gap="sm">
                  {(drugOrders ?? []).map((order) => (
                    <Paper key={order.id} withBorder p="sm">
                      <Group gap="xs" mb="xs">
                        <Text size="sm" fw={600}>{order.orderNo}</Text>
                        <Badge size="sm" color={order.status === 3 ? 'green' : order.status === 2 ? 'blue' : 'yellow'}>
                          {order.status === 1 ? 'รอจ่าย' : order.status === 2 ? 'ตรวจสอบแล้ว' : order.status === 3 ? 'จ่ายแล้ว' : 'ยกเลิก'}
                        </Badge>
                      </Group>
                      {order.items.map((item) => (
                        <Text key={item.id} size="sm">
                          • {item.productName} {item.quantity} {item.unit ?? ''} {item.frequency} × {item.durationDays} วัน
                          {item.instruction ? ` — ${item.instruction}` : ''}
                        </Text>
                      ))}
                    </Paper>
                  ))}

                  <Divider label="สั่งยาใหม่" />

                  <TextInput
                    label="ค้นหายา"
                    placeholder="เช่น พาราเซตามอล"
                    value={drugSearch}
                    onChange={(e) => setDrugSearch(e.target.value)}
                  />
                  {(drugResults ?? []).length > 0 && !selectedDrug && (
                    <Paper withBorder p="xs">
                      {(drugResults ?? []).map((d) => (
                        <Text key={d.id} size="sm" p="xs" style={{ cursor: 'pointer' }}
                          onClick={() => { setSelectedDrug(d); setDrugSearch(d.name); }}>
                          <strong>{d.code}</strong> — {d.name} ({d.unit})
                        </Text>
                      ))}
                    </Paper>
                  )}
                  {selectedDrug && (
                    <Alert color="blue" title={selectedDrug.name}>
                      <Grid>
                        <Grid.Col span={4}>
                          <NumberInput label="จำนวน" value={drugQty} onChange={setDrugQty} min={1} />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <Select label="ความถี่" data={FREQUENCY_OPTIONS} value={drugFreq} onChange={setDrugFreq} />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <NumberInput label="จำนวนวัน" value={drugDays} onChange={setDrugDays} min={1} />
                        </Grid.Col>
                        <Grid.Col span={12}>
                          <TextInput label="คำแนะนำ" value={drugInstruction} onChange={(e) => setDrugInstruction(e.target.value)} placeholder="เช่น ทานหลังอาหาร" />
                        </Grid.Col>
                      </Grid>
                      <Group mt="sm" justify="flex-end">
                        <Button variant="default" size="sm" onClick={() => { setSelectedDrug(null); setDrugSearch(''); }}>ล้าง</Button>
                        <Button size="sm" onClick={handleAddDrug} loading={createOrderMutation.isPending}>สั่งยา</Button>
                      </Group>
                    </Alert>
                  )}
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}
      </Grid.Col>
    </Grid>
  );
}
