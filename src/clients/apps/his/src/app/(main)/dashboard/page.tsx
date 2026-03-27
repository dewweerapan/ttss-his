'use client';
import { Card, Grid, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('his_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <Stack gap="md">
      <Title order={3}>Dashboard</Title>
      {user && (
        <Text>ยินดีต้อนรับ {user.firstName} {user.lastName} ({user.role})</Text>
      )}
      <Grid>
        {[
          { label: 'ทะเบียนผู้ป่วย', value: 'REG', color: 'blue' },
          { label: 'คิวรอตรวจ', value: 'QUE', color: 'teal' },
          { label: 'Triage', value: 'MAI', color: 'orange' },
          { label: 'ตรวจ OPD', value: 'DPO', color: 'violet' },
          { label: 'จ่ายยา', value: 'TPD', color: 'green' },
          { label: 'การเงิน', value: 'BIL', color: 'red' },
        ].map((m) => (
          <Grid.Col key={m.value} span={{ base: 12, sm: 6, md: 4 }}>
            <Card withBorder shadow="sm" p="lg">
              <Text fw={700} c={m.color} size="xl">{m.value}</Text>
              <Text size="sm" c="dimmed">{m.label}</Text>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </Stack>
  );
}
