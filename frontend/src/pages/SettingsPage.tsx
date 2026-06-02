import { useEffect, useState } from 'react';
import { Card, Table, Timeline, Typography } from 'antd';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { apiActions } from '../api/client';
import type { Company } from '../types';

const { Title, Text } = Typography;

interface AuditEntry {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  createdAt: string;
  user?: { name: string; email: string };
}

export default function SettingsPage() {
  const { state } = useApp();
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (localStorage.getItem('token') === 'mock-dev-token') return;
    apiActions.getAuditLog({ limit: 20 })
      .then(res => setAudit(res.data))
      .catch(() => {});
  }, []);

  const columns = [
    { title: 'Наименование', dataIndex: 'name', key: 'name', render: (v: string) => <span style={{ fontWeight: 550 }}>{v}</span> },
    { title: 'ИНН', dataIndex: 'inn', key: 'inn' },
    { title: 'Вид деятельности', dataIndex: 'activity', key: 'activity' },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Настройки</Title>
      <Card title="Компании ГК «Самолёт»" style={{ marginBottom: 16 }}>
        <Table<Company> rowKey="id" dataSource={state.companies} columns={columns} pagination={false} size="middle" />
      </Card>
      <Card title="Интеграции" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: '#f5f5f5', borderRadius: 8, border: '1px solid #e8e8e8' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #E87722, #C05E10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>КФ</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Контур.Фокус</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>Мониторинг изменений по компаниям</div>
          </div>
          <StatusBadge status="submitted" />
        </div>
      </Card>
      {audit.length > 0 && (
        <Card title="Журнал аудита">
          <Timeline
            items={audit.map(a => ({
              children: (
                <div>
                  <Text strong>{a.action}</Text> — {a.entityType} #{a.entityId}
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {a.user?.name || 'Система'} · {new Date(a.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              ),
            }))}
          />
        </Card>
      )}
    </div>
  );
}
