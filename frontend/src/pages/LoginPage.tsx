import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';

const { Title, Text } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/companies');
  }, [navigate]);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Добро пожаловать!');
      navigate('/companies');
    } catch {
      message.error('Неверный email или пароль. Убедитесь, что backend и база данных запущены.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#0055FF', color: '#fff', fontWeight: 800, fontSize: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>С</div>
          <Title level={4} style={{ margin: 0 }}>ГК «Самолёт»</Title>
          <Text type="secondary">Процессы по ПДн</Text>
        </div>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ email: 'admin@samolet.ru', password: 'admin123' }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Введите email' }]}>
            <Input prefix={<MailOutlined />} placeholder="admin@samolet.ru" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Введите пароль' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  );
}
