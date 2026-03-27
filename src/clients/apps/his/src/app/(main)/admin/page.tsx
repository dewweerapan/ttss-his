// src/clients/apps/his/src/app/(main)/admin/page.tsx
'use client';
import { useState } from 'react';
import {
  Alert, Badge, Button, Checkbox, Group, Modal, NumberInput,
  Paper, Select, Stack, Table, Tabs, Text, TextInput, Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
type UserDto = { id: string; username: string; firstName: string; lastName: string; roleId: string; isActive: boolean; createdDate: string };
type ProductDto = { id: string; code: string; name: string; type: number; unit: string; isActive: boolean; price: number };
type DivisionDto = { id: string; code: string; name: string; type: number; isActive: boolean };

const ROLE_OPTIONS = [
  { value: 'role-doctor', label: 'แพทย์' },
  { value: 'role-nurse', label: 'พยาบาล' },
  { value: 'role-pharmacist', label: 'เภสัชกร' },
  { value: 'role-finance', label: 'การเงิน' },
];

const PRODUCT_TYPE_OPTIONS = [
  { value: '1', label: 'ยา' },
  { value: '2', label: 'บริการ' },
  { value: '3', label: 'วัสดุ' },
];

const DIV_TYPE_OPTIONS = [
  { value: '1', label: 'OPD' },
  { value: '2', label: 'IPD' },
  { value: '3', label: 'ER' },
  { value: '4', label: 'Lab' },
  { value: '9', label: 'อื่นๆ' },
];

// ── Page ───────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>('users');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Users ──────────────────────────────────────────────────────────────
  const [userOpen, { open: openUser, close: closeUser }] = useDisclosure(false);
  const [editUser, setEditUser] = useState<UserDto | null>(null);
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uFirstName, setUFirstName] = useState('');
  const [uLastName, setULastName] = useState('');
  const [uRoleId, setURoleId] = useState<string | null>('role-doctor');
  const [uIsActive, setUIsActive] = useState(true);

  // ── Products ───────────────────────────────────────────────────────────
  const [productOpen, { open: openProduct, close: closeProduct }] = useDisclosure(false);
  const [editProduct, setEditProduct] = useState<ProductDto | null>(null);
  const [pCode, setPCode] = useState('');
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState<string | null>('1');
  const [pUnit, setPUnit] = useState('เม็ด');
  const [pPrice, setPPrice] = useState<number | string>(0);
  const [pIsActive, setPIsActive] = useState(true);
  const [productSearch, setProductSearch] = useState('');

  // ── Divisions ──────────────────────────────────────────────────────────
  const [divOpen, { open: openDiv, close: closeDiv }] = useDisclosure(false);
  const [editDiv, setEditDiv] = useState<DivisionDto | null>(null);
  const [dCode, setDCode] = useState('');
  const [dName, setDName] = useState('');
  const [dType, setDType] = useState<string | null>('1');
  const [dIsActive, setDIsActive] = useState(true);

  // ── Queries ───────────────────────────────────────────────────────────
  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<UserDto[]>('/api/admin/users'),
    enabled: activeTab === 'users',
  });

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ['admin', 'products', productSearch],
    queryFn: () => api.get<ProductDto[]>(`/api/admin/products${productSearch ? `?search=${encodeURIComponent(productSearch)}` : ''}`),
    enabled: activeTab === 'products',
  });

  const { data: divisions = [], refetch: refetchDivisions } = useQuery({
    queryKey: ['admin', 'divisions'],
    queryFn: () => api.get<DivisionDto[]>('/api/admin/divisions'),
    enabled: activeTab === 'divisions',
  });

  // ── Mutations — Users ─────────────────────────────────────────────────
  const createUserMutation = useMutation({
    mutationFn: () => api.post('/api/admin/users', { username: uUsername, password: uPassword, firstName: uFirstName, lastName: uLastName, roleId: uRoleId }),
    onSuccess: () => { setSuccessMsg('สร้างผู้ใช้สำเร็จ'); setErrorMsg(''); closeUser(); refetchUsers(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: () => api.patch(`/api/admin/users/${editUser!.id}`, { firstName: uFirstName, lastName: uLastName, roleId: uRoleId, isActive: uIsActive, newPassword: uPassword || null }),
    onSuccess: () => { setSuccessMsg('แก้ไขผู้ใช้สำเร็จ'); setErrorMsg(''); closeUser(); refetchUsers(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/users/${id}`),
    onSuccess: () => { setSuccessMsg('ลบผู้ใช้สำเร็จ'); refetchUsers(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  // ── Mutations — Products ───────────────────────────────────────────────
  const createProductMutation = useMutation({
    mutationFn: () => api.post('/api/admin/products', { code: pCode, name: pName, type: Number(pType), unit: pUnit, isBillable: true, price: Number(pPrice) }),
    onSuccess: () => { setSuccessMsg('สร้างรายการสำเร็จ'); setErrorMsg(''); closeProduct(); refetchProducts(); qc.invalidateQueries({ queryKey: ['masterdata'] }); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const updateProductMutation = useMutation({
    mutationFn: () => api.patch(`/api/admin/products/${editProduct!.id}`, { name: pName, unit: pUnit, isActive: pIsActive, price: Number(pPrice) }),
    onSuccess: () => { setSuccessMsg('แก้ไขรายการสำเร็จ'); setErrorMsg(''); closeProduct(); refetchProducts(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/products/${id}`),
    onSuccess: () => { setSuccessMsg('ลบรายการสำเร็จ'); refetchProducts(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  // ── Mutations — Divisions ─────────────────────────────────────────────
  const createDivMutation = useMutation({
    mutationFn: () => api.post('/api/admin/divisions', { code: dCode, name: dName, type: Number(dType) }),
    onSuccess: () => { setSuccessMsg('สร้างแผนกสำเร็จ'); setErrorMsg(''); closeDiv(); refetchDivisions(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  const updateDivMutation = useMutation({
    mutationFn: () => api.patch(`/api/admin/divisions/${editDiv!.id}`, { name: dName, type: Number(dType), isActive: dIsActive }),
    onSuccess: () => { setSuccessMsg('แก้ไขแผนกสำเร็จ'); setErrorMsg(''); closeDiv(); refetchDivisions(); },
    onError: (e: Error) => setErrorMsg(e.message),
  });

  // ── Helpers ────────────────────────────────────────────────────────────
  const openNewUser = () => {
    setEditUser(null); setUUsername(''); setUPassword(''); setUFirstName(''); setULastName(''); setURoleId('role-doctor'); setUIsActive(true); setErrorMsg(''); openUser();
  };
  const openEditUser = (u: UserDto) => {
    setEditUser(u); setUUsername(u.username); setUPassword(''); setUFirstName(u.firstName); setULastName(u.lastName); setURoleId(u.roleId); setUIsActive(u.isActive); setErrorMsg(''); openUser();
  };
  const openNewProduct = () => {
    setEditProduct(null); setPCode(''); setPName(''); setPType('1'); setPUnit('เม็ด'); setPPrice(0); setPIsActive(true); setErrorMsg(''); openProduct();
  };
  const openEditProduct = (p: ProductDto) => {
    setEditProduct(p); setPCode(p.code); setPName(p.name); setPType(String(p.type)); setPUnit(p.unit); setPPrice(p.price); setPIsActive(p.isActive); setErrorMsg(''); openProduct();
  };
  const openNewDiv = () => {
    setEditDiv(null); setDCode(''); setDName(''); setDType('1'); setDIsActive(true); setErrorMsg(''); openDiv();
  };
  const openEditDiv = (d: DivisionDto) => {
    setEditDiv(d); setDCode(d.code); setDName(d.name); setDType(String(d.type)); setDIsActive(d.isActive); setErrorMsg(''); openDiv();
  };

  return (
    <Stack gap="md">
      <Title order={3}>Admin — จัดการระบบ</Title>

      {successMsg && <Alert color="green" onClose={() => setSuccessMsg('')} withCloseButton>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" onClose={() => setErrorMsg('')} withCloseButton>{errorMsg}</Alert>}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="users">ผู้ใช้งาน</Tabs.Tab>
          <Tabs.Tab value="products">รายการยา/บริการ</Tabs.Tab>
          <Tabs.Tab value="divisions">แผนก</Tabs.Tab>
        </Tabs.List>

        {/* ── USERS TAB ─────────────────────────────────────────────────── */}
        <Tabs.Panel value="users" pt="sm">
          <Stack gap="sm">
            <Group justify="flex-end">
              <Button size="sm" onClick={openNewUser}>+ เพิ่มผู้ใช้</Button>
            </Group>
            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Username</Table.Th>
                    <Table.Th>ชื่อ-นามสกุล</Table.Th>
                    <Table.Th>บทบาท</Table.Th>
                    <Table.Th>สถานะ</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {users.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed">ไม่มีข้อมูล</Text></Table.Td></Table.Tr>
                  ) : users.map(u => (
                    <Table.Tr key={u.id}>
                      <Table.Td><Text fw={600} size="sm">{u.username}</Text></Table.Td>
                      <Table.Td><Text size="sm">{u.firstName} {u.lastName}</Text></Table.Td>
                      <Table.Td><Text size="sm">{ROLE_OPTIONS.find(r => r.value === u.roleId)?.label ?? u.roleId}</Text></Table.Td>
                      <Table.Td><Badge size="sm" color={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'ใช้งาน' : 'ปิดใช้'}</Badge></Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Button size="xs" variant="outline" onClick={() => openEditUser(u)}>แก้ไข</Button>
                          <Button size="xs" color="red" variant="subtle" loading={deleteUserMutation.isPending} onClick={() => deleteUserMutation.mutate(u.id)}>ลบ</Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* ── PRODUCTS TAB ──────────────────────────────────────────────── */}
        <Tabs.Panel value="products" pt="sm">
          <Stack gap="sm">
            <Group justify="space-between">
              <TextInput placeholder="ค้นหา code / ชื่อ..." value={productSearch} onChange={e => setProductSearch(e.target.value)} style={{ width: 250 }} />
              <Button size="sm" onClick={openNewProduct}>+ เพิ่มรายการ</Button>
            </Group>
            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Code</Table.Th>
                    <Table.Th>ชื่อ</Table.Th>
                    <Table.Th>ประเภท</Table.Th>
                    <Table.Th>หน่วย</Table.Th>
                    <Table.Th ta="right">ราคา (฿)</Table.Th>
                    <Table.Th>สถานะ</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {products.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={7}><Text ta="center" c="dimmed">ไม่มีข้อมูล</Text></Table.Td></Table.Tr>
                  ) : products.map(p => (
                    <Table.Tr key={p.id}>
                      <Table.Td><Text fw={600} size="sm">{p.code}</Text></Table.Td>
                      <Table.Td><Text size="sm">{p.name}</Text></Table.Td>
                      <Table.Td><Text size="sm">{PRODUCT_TYPE_OPTIONS.find(t => t.value === String(p.type))?.label ?? '-'}</Text></Table.Td>
                      <Table.Td><Text size="sm">{p.unit}</Text></Table.Td>
                      <Table.Td ta="right"><Text size="sm">{p.price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text></Table.Td>
                      <Table.Td><Badge size="sm" color={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'ใช้งาน' : 'ปิด'}</Badge></Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Button size="xs" variant="outline" onClick={() => openEditProduct(p)}>แก้ไข</Button>
                          <Button size="xs" color="red" variant="subtle" loading={deleteProductMutation.isPending} onClick={() => deleteProductMutation.mutate(p.id)}>ลบ</Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* ── DIVISIONS TAB ─────────────────────────────────────────────── */}
        <Tabs.Panel value="divisions" pt="sm">
          <Stack gap="sm">
            <Group justify="flex-end">
              <Button size="sm" onClick={openNewDiv}>+ เพิ่มแผนก</Button>
            </Group>
            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Code</Table.Th>
                    <Table.Th>ชื่อแผนก</Table.Th>
                    <Table.Th>ประเภท</Table.Th>
                    <Table.Th>สถานะ</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {divisions.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed">ไม่มีข้อมูล</Text></Table.Td></Table.Tr>
                  ) : divisions.map(d => (
                    <Table.Tr key={d.id}>
                      <Table.Td><Text fw={600} size="sm">{d.code}</Text></Table.Td>
                      <Table.Td><Text size="sm">{d.name}</Text></Table.Td>
                      <Table.Td><Text size="sm">{DIV_TYPE_OPTIONS.find(t => t.value === String(d.type))?.label ?? '-'}</Text></Table.Td>
                      <Table.Td><Badge size="sm" color={d.isActive ? 'green' : 'gray'}>{d.isActive ? 'ใช้งาน' : 'ปิด'}</Badge></Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="outline" onClick={() => openEditDiv(d)}>แก้ไข</Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* User Modal */}
      <Modal opened={userOpen} onClose={closeUser} title={editUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}>
        <Stack gap="sm">
          {!editUser && <TextInput label="Username" value={uUsername} onChange={e => setUUsername(e.target.value)} required />}
          <TextInput label={editUser ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน'} type="password" value={uPassword} onChange={e => setUPassword(e.target.value)} required={!editUser} />
          <Group grow>
            <TextInput label="ชื่อ" value={uFirstName} onChange={e => setUFirstName(e.target.value)} required />
            <TextInput label="นามสกุล" value={uLastName} onChange={e => setULastName(e.target.value)} required />
          </Group>
          <Select label="บทบาท" data={ROLE_OPTIONS} value={uRoleId} onChange={setURoleId} />
          {editUser && <Checkbox label="ใช้งาน" checked={uIsActive} onChange={e => setUIsActive(e.currentTarget.checked)} />}
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeUser}>ยกเลิก</Button>
            <Button loading={editUser ? updateUserMutation.isPending : createUserMutation.isPending}
              onClick={() => editUser ? updateUserMutation.mutate() : createUserMutation.mutate()}>
              {editUser ? 'บันทึก' : 'สร้าง'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Product Modal */}
      <Modal opened={productOpen} onClose={closeProduct} title={editProduct ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}>
        <Stack gap="sm">
          {!editProduct && <TextInput label="Code" value={pCode} onChange={e => setPCode(e.target.value)} required />}
          <TextInput label="ชื่อ" value={pName} onChange={e => setPName(e.target.value)} required />
          {!editProduct && <Select label="ประเภท" data={PRODUCT_TYPE_OPTIONS} value={pType} onChange={setPType} />}
          <TextInput label="หน่วย" value={pUnit} onChange={e => setPUnit(e.target.value)} />
          <NumberInput label="ราคา (฿)" value={pPrice} onChange={setPPrice} min={0} decimalScale={2} />
          {editProduct && <Checkbox label="ใช้งาน" checked={pIsActive} onChange={e => setPIsActive(e.currentTarget.checked)} />}
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeProduct}>ยกเลิก</Button>
            <Button loading={editProduct ? updateProductMutation.isPending : createProductMutation.isPending}
              onClick={() => editProduct ? updateProductMutation.mutate() : createProductMutation.mutate()}>
              {editProduct ? 'บันทึก' : 'สร้าง'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Division Modal */}
      <Modal opened={divOpen} onClose={closeDiv} title={editDiv ? 'แก้ไขแผนก' : 'เพิ่มแผนกใหม่'}>
        <Stack gap="sm">
          {!editDiv && <TextInput label="Code" value={dCode} onChange={e => setDCode(e.target.value)} required />}
          <TextInput label="ชื่อแผนก" value={dName} onChange={e => setDName(e.target.value)} required />
          <Select label="ประเภท" data={DIV_TYPE_OPTIONS} value={dType} onChange={setDType} />
          {editDiv && <Checkbox label="ใช้งาน" checked={dIsActive} onChange={e => setDIsActive(e.currentTarget.checked)} />}
          {errorMsg && <Alert color="red">{errorMsg}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDiv}>ยกเลิก</Button>
            <Button loading={editDiv ? updateDivMutation.isPending : createDivMutation.isPending}
              onClick={() => editDiv ? updateDivMutation.mutate() : createDivMutation.mutate()}>
              {editDiv ? 'บันทึก' : 'สร้าง'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
