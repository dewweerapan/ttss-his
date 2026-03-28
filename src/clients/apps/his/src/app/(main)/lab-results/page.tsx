// src/clients/apps/his/src/app/(main)/lab-results/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Group, Paper, Stack, Table, Text, TextInput, Title,
  Collapse, ActionIcon,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Patient = { id: string; hn: string; firstName: string; lastName: string; preName?: string };
type LabResultDto = {
  id: string; value: string; referenceRange?: string;
  isAbnormal: boolean; enteredBy?: string; resultDate: string; notes?: string;
};
type LabOrderItemDto = {
  id: string; testCode: string; testName: string; unit?: string;
  referenceRange?: string; result?: LabResultDto;
};
type LabOrderDto = {
  id: string; orderNo: string; requestDate: string;
  orderedBy?: string; items: LabOrderItemDto[];
};

export default function LabResultsPage() {
  const [searchHn, setSearchHn] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: patients = [], isFetching: searching } = useQuery({
    queryKey: ['patient-search', searchHn],
    queryFn: () => api.get<Patient[]>(`/api/patients?search=${searchHn}`),
    enabled: searchHn.length >= 2,
  });

  const { data: history = [], isFetching: loadingHistory } = useQuery({
    queryKey: ['lab-history', selectedPatient?.id],
    queryFn: () => api.get<LabOrderDto[]>(`/api/patients/${selectedPatient!.id}/lab-history`),
    enabled: !!selectedPatient,
  });

  // Detect critical values (abnormal items)
  const criticalItems = history.flatMap(o =>
    o.items.filter(i => i.result?.isAbnormal).map(i => ({ orderNo: o.orderNo, ...i }))
  );

  return (
    <Stack gap="md">
      <Title order={3}>ผลแลบสะสม (Lab Result Management)</Title>

      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Paper withBorder p="sm">
        <Stack gap="sm">
          <Text fw={500}>ค้นหาผู้ป่วย</Text>
          <TextInput
            placeholder="พิมพ์ HN หรือชื่อ (อย่างน้อย 2 ตัวอักษร)..."
            value={searchHn}
            onChange={e => setSearchHn(e.target.value)}
          />
          {searchHn.length >= 2 && (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>HN</Table.Th><Table.Th>ชื่อ</Table.Th><Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {patients.length === 0 ? (
                  <Table.Tr><Table.Td colSpan={3}><Text ta="center" c="dimmed">ไม่พบผู้ป่วย</Text></Table.Td></Table.Tr>
                ) : patients.map(p => (
                  <Table.Tr key={p.id}>
                    <Table.Td><Text size="sm">{p.hn}</Text></Table.Td>
                    <Table.Td><Text size="sm">{p.preName}{p.firstName} {p.lastName}</Text></Table.Td>
                    <Table.Td>
                      <Button size="xs" variant="light" onClick={() => {
                        setSelectedPatient(p); setSearchHn('');
                      }}>เลือก</Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Paper>

      {selectedPatient && (
        <>
          <Group>
            <Text fw={600}>ผู้ป่วย: {selectedPatient.preName}{selectedPatient.firstName} {selectedPatient.lastName}</Text>
            <Badge variant="light">{selectedPatient.hn}</Badge>
            <Button size="xs" variant="subtle" color="red" onClick={() => setSelectedPatient(null)}>เปลี่ยนผู้ป่วย</Button>
          </Group>

          {criticalItems.length > 0 && (
            <Alert color="red" title={`⚠ Critical Values (${criticalItems.length} รายการ)`}>
              {criticalItems.map((ci, idx) => (
                <Text key={idx} size="sm">
                  [{ci.orderNo}] <strong>{ci.testName}</strong>: {ci.result?.value} {ci.unit ?? ''} — ผิดปกติ
                </Text>
              ))}
            </Alert>
          )}

          <Paper withBorder>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>เลขที่ใบสั่ง</Table.Th>
                  <Table.Th>วันที่</Table.Th>
                  <Table.Th>จำนวนรายการ</Table.Th>
                  <Table.Th>ผิดปกติ</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {history.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center" c="dimmed">{loadingHistory ? 'กำลังโหลด...' : 'ไม่มีผลแลบ'}</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : history.map(o => (
                  <>
                    <Table.Tr key={o.id}>
                      <Table.Td><Text size="sm" fw={500}>{o.orderNo}</Text></Table.Td>
                      <Table.Td><Text size="xs">{new Date(o.requestDate).toLocaleDateString('th-TH')}</Text></Table.Td>
                      <Table.Td><Text size="sm">{o.items.length} รายการ</Text></Table.Td>
                      <Table.Td>
                        {o.items.some(i => i.result?.isAbnormal) ? (
                          <Badge color="red" size="sm">มีผิดปกติ</Badge>
                        ) : (
                          <Badge color="green" size="sm">ปกติ</Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light"
                          onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                          {expandedOrder === o.id ? 'ซ่อน' : 'ดูรายละเอียด'}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                    {expandedOrder === o.id && (
                      <Table.Tr key={`${o.id}-detail`}>
                        <Table.Td colSpan={5} style={{ background: '#f8f9fa' }}>
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>รหัส</Table.Th>
                                <Table.Th>รายการ</Table.Th>
                                <Table.Th>ผล</Table.Th>
                                <Table.Th>หน่วย</Table.Th>
                                <Table.Th>ค่าอ้างอิง</Table.Th>
                                <Table.Th>สถานะ</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {o.items.map(item => (
                                <Table.Tr key={item.id}>
                                  <Table.Td><Text size="xs">{item.testCode}</Text></Table.Td>
                                  <Table.Td><Text size="sm">{item.testName}</Text></Table.Td>
                                  <Table.Td>
                                    <Text size="sm" fw={item.result?.isAbnormal ? 700 : 400}
                                      c={item.result?.isAbnormal ? 'red' : undefined}>
                                      {item.result?.value ?? '-'}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td><Text size="xs">{item.unit ?? '-'}</Text></Table.Td>
                                  <Table.Td><Text size="xs">{item.result?.referenceRange ?? item.referenceRange ?? '-'}</Text></Table.Td>
                                  <Table.Td>
                                    {item.result ? (
                                      <Badge size="xs" color={item.result.isAbnormal ? 'red' : 'green'}>
                                        {item.result.isAbnormal ? 'ผิดปกติ' : 'ปกติ'}
                                      </Badge>
                                    ) : <Badge size="xs" color="gray">รอผล</Badge>}
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </>
      )}
    </Stack>
  );
}
