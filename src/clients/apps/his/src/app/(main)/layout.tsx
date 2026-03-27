'use client';
import { AppShell, Badge, Burger, Group, NavLink, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type NotificationCounts = {
  pendingDrugOrders: number;
  pendingLabOrders: number;
  pendingInvoices: number;
  waitingQueue: number;
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('his_token');
    if (!token) router.push('/sign-in');
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

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'ทะเบียนผู้ป่วย (REG)', href: '/registration' },
    { label: 'คิว (QUE)', href: '/queue', badge: counts?.waitingQueue },
    { label: 'Triage (MAI)', href: '/triage' },
    { label: 'ตรวจ OPD (DPO)', href: '/doctor' },
    { label: 'เภสัช (TPD)', href: '/pharmacy', badge: counts?.pendingDrugOrders },
    { label: 'การเงิน (BIL)', href: '/billing', badge: counts?.pendingInvoices },
    { label: 'Ward Board (IPD)', href: '/ward' },
    { label: 'รับผู้ป่วยใน (IPD)', href: '/admissions' },
    { label: 'IPD Chart', href: '/ipd-chart' },
    { label: 'ห้องฉุกเฉิน (ER)', href: '/er' },
    { label: 'ห้องปฏิบัติการ (LAB)', href: '/lab', badge: counts?.pendingLabOrders },
    { label: 'นัดหมาย (APP)', href: '/appointments' },
    { label: 'Admin', href: '/admin' },
  ];

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>TTSS HIS</Title>
          </Group>
          <Text size="sm" style={{ cursor: 'pointer' }} c="dimmed" onClick={handleLogout}>ออกจากระบบ</Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            label={item.label}
            active={pathname === item.href}
            onClick={() => router.push(item.href)}
            rightSection={
              item.badge != null && item.badge > 0
                ? <Badge size="xs" circle color="red">{item.badge > 99 ? '99+' : item.badge}</Badge>
                : undefined
            }
          />
        ))}
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
