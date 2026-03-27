'use client';
import { useState } from 'react';
import { Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
        return;
      }

      const data = await res.json();
      localStorage.setItem('his_token', data.accessToken);
      localStorage.setItem('his_user', JSON.stringify(data));
      router.push('/dashboard');
    } catch {
      setError('ไม่สามารถเชื่อมต่อ server ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center h="100vh" bg="gray.1">
      <Paper shadow="md" p="xl" w={360} withBorder>
        <Stack gap="md">
          <Title order={2} ta="center">TTSS HIS</Title>
          <Text c="dimmed" ta="center" size="sm">ระบบสารสนเทศโรงพยาบาล</Text>
          <TextInput
            label="ชื่อผู้ใช้งาน"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <PasswordInput
            label="รหัสผ่าน"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {error && <Text c="red" size="sm">{error}</Text>}
          <Button onClick={handleLogin} loading={loading} fullWidth>
            เข้าสู่ระบบ
          </Button>
          <Text size="xs" c="dimmed" ta="center">
            doctor1/doctor1234 · nurse1/nurse1234 · pharmacist1/pharma1234 · finance1/finance1234
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
