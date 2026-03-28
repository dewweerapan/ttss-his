'use client';
import {
  AppShell, Avatar, Badge, Burger, Divider, Group, NavLink,
  Stack, Text, ThemeIcon, Tooltip, ActionIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  IconLayoutDashboard, IconUserPlus, IconList, IconActivity,
  IconStethoscope, IconPill, IconReceipt, IconBed,
  IconBuildingHospital, IconClipboardList, IconScissors,
  IconDroplet, IconAmbulance, IconFlask, IconChartLine,
  IconRadioactive, IconMicroscope, IconDroplets, IconBandage,
  IconTool, IconVideo, IconCalendar, IconFileInvoice, IconVirus,
  IconArrowRight, IconHeart, IconClipboardCheck, IconChartBar,
  IconSettings, IconLogout, IconUsers,
} from '@tabler/icons-react';

type NotificationCounts = {
  pendingDrugOrders: number;
  pendingLabOrders: number;
  pendingInvoices: number;
  waitingQueue: number;
};

type StoredUser = {
  accessToken: string;
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
};

type NavItem = { label: string; href: string; icon: React.ComponentType<{ size?: number | string }>; badge?: number };
type NavGroup = { group: string; items: NavItem[] };

const ROLE_COLOR: Record<string, string> = {
  Doctor: 'blue',
  Nurse: 'teal',
  Pharmacist: 'green',
  Finance: 'yellow',
  Admin: 'red',
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();
  const pathname = usePathname();
  const [storedUser, setStoredUser] = useState<StoredUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('his_user');
      return raw ? (JSON.parse(raw) as StoredUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('his_token');
    if (!token) {
      router.push('/sign-in');
    }
  }, [router]);

  const { data: counts } = useQuery<NotificationCounts>({
    queryKey: ['notification-counts'],
    queryFn: () => api.get<NotificationCounts>('/api/notifications/counts'),
    refetchInterval: 30000,
    retry: false,
  });

  const handleLogout = () => {
    localStorage.removeItem('his_token');
    localStorage.removeItem('his_user');
    router.push('/sign-in');
  };

  const navGroups = useMemo<NavGroup[]>(() => [
    {
      group: 'OPD',
      items: [
        { label: 'ทะเบียนผู้ป่วย (REG)', href: '/registration', icon: IconUserPlus },
        { label: 'คิว (QUE)', href: '/queue', icon: IconList, badge: counts?.waitingQueue },
        { label: 'Triage (MAI)', href: '/triage', icon: IconActivity },
        { label: 'ตรวจ OPD (DPO)', href: '/doctor', icon: IconStethoscope },
        { label: 'เภสัช (TPD)', href: '/pharmacy', icon: IconPill, badge: counts?.pendingDrugOrders },
        { label: 'การเงิน (BIL)', href: '/billing', icon: IconReceipt, badge: counts?.pendingInvoices },
      ],
    },
    {
      group: 'IPD',
      items: [
        { label: 'Ward Board (IPD)', href: '/ward', icon: IconBed },
        { label: 'รับผู้ป่วยใน (IPD)', href: '/admissions', icon: IconBuildingHospital },
        { label: 'IPD Chart', href: '/ipd-chart', icon: IconClipboardList },
      ],
    },
    {
      group: 'ศัลยกรรม & วิกฤต',
      items: [
        { label: 'ห้องผ่าตัด (ORM)', href: '/or', icon: IconScissors },
        { label: 'คลังโลหิต (BLB)', href: '/blood-bank', icon: IconDroplet },
        { label: 'ห้องฉุกเฉิน (ER)', href: '/er', icon: IconAmbulance },
      ],
    },
    {
      group: 'Diagnostics',
      items: [
        { label: 'ห้องปฏิบัติการ (LAB)', href: '/lab', icon: IconFlask, badge: counts?.pendingLabOrders },
        { label: 'ผลแลบสะสม (LRM)', href: '/lab-results', icon: IconChartLine },
        { label: 'รังสีวิทยา (IME)', href: '/imaging', icon: IconRadioactive },
        { label: 'พยาธิวิทยา (PTH)', href: '/pathology', icon: IconMicroscope },
      ],
    },
    {
      group: 'Specialized',
      items: [
        { label: 'ฟอกไต (HDM)', href: '/hemodialysis', icon: IconDroplets },
        { label: 'ห้องหัตถการ (TRT)', href: '/treatment', icon: IconBandage },
        { label: 'ทันตกรรม (DEN)', href: '/dental', icon: IconTool },
        { label: 'โทรเวช (TEC)', href: '/teleconsult', icon: IconVideo },
      ],
    },
    {
      group: 'Admin',
      items: [
        { label: 'นัดหมาย (APP)', href: '/appointments', icon: IconCalendar },
        { label: 'เคลมประกัน (CLM)', href: '/claims', icon: IconFileInvoice },
        { label: 'ควบคุมการติดเชื้อ (INF)', href: '/infection-control', icon: IconVirus },
        { label: 'ส่งต่อ (AGN)', href: '/referring', icon: IconArrowRight },
        { label: 'บันทึกสุขภาพ (PHR)', href: '/phr', icon: IconHeart },
        { label: 'ลงทะเบียนล่วงหน้า (PRP)', href: '/pre-registration', icon: IconClipboardCheck },
        { label: 'รายงาน (RPT)', href: '/reports', icon: IconChartBar },
        { label: 'Admin', href: '/admin', icon: IconSettings },
      ],
    },
  ], [counts]);

  const initials = storedUser
    ? (storedUser.firstName?.[0] ?? storedUser.username?.[0] ?? '?').toUpperCase()
    : '?';

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
      styles={{ main: { backgroundColor: 'var(--mantine-color-gray-0)' } }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <ThemeIcon variant="light" color="blue" size="md">
              <IconBuildingHospital size={16} />
            </ThemeIcon>
            <Text component="h4" fw={700} size="md" style={{ margin: 0 }}>TTSS HIS</Text>
          </Group>
          <Group gap="sm">
            <Avatar color="blue" radius="xl" size="sm">{initials}</Avatar>
            <Stack gap={0} visibleFrom="sm">
              <Text size="sm" fw={500} data-testid="header-username" lh={1.2}>
                {storedUser ? `${storedUser.firstName} ${storedUser.lastName}`.trim() || storedUser.username : ''}
              </Text>
              <Badge
                size="xs"
                variant="light"
                color={ROLE_COLOR[storedUser?.role ?? ''] ?? 'gray'}
                data-testid="header-role-badge"
              >
                {storedUser?.role ?? ''}
              </Badge>
            </Stack>
            <Tooltip label="ออกจากระบบ">
              <ActionIcon variant="subtle" color="gray" onClick={handleLogout} aria-label="ออกจากระบบ" data-testid="logout-button">
                <IconLogout size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs" style={{ overflowY: 'auto' }}>
        <NavLink
          label="Dashboard"
          leftSection={<IconLayoutDashboard size={16} />}
          active={pathname === '/dashboard'}
          onClick={() => router.push('/dashboard')}
          styles={{
            root: {
              borderRadius: 'var(--mantine-radius-sm)',
              ...(pathname === '/dashboard' && {
                borderLeft: '3px solid var(--mantine-color-blue-6)',
                backgroundColor: 'var(--mantine-color-blue-0)',
                color: 'var(--mantine-color-blue-7)',
                fontWeight: 600,
              }),
            },
          }}
        />

        {navGroups.map((group, gi) => (
          <Stack key={group.group} gap={0} mt={gi === 0 ? 'xs' : 0}>
            <Divider
              label={
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="xs">
                  {group.group}
                </Text>
              }
              labelPosition="left"
              my="xs"
            />
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  label={item.label}
                  leftSection={<Icon size={16} />}
                  active={isActive}
                  onClick={() => router.push(item.href)}
                  rightSection={
                    item.badge != null && item.badge > 0
                      ? <Badge size="xs" circle color="red">{item.badge > 99 ? '99+' : item.badge}</Badge>
                      : undefined
                  }
                  styles={{
                    root: {
                      borderRadius: 'var(--mantine-radius-sm)',
                      ...(isActive && {
                        borderLeft: '3px solid var(--mantine-color-blue-6)',
                        backgroundColor: 'var(--mantine-color-blue-0)',
                        color: 'var(--mantine-color-blue-7)',
                        fontWeight: 600,
                      }),
                    },
                  }}
                />
              );
            })}
          </Stack>
        ))}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
