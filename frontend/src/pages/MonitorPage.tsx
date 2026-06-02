import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { EVENT_TYPES } from '../constants';
import type { MonitorEvent } from '../types';

const { Title } = Typography;

const eventTagColor: Record<string, string> = {
  ceo_change: 'red',
  address_change: 'gold',
};

export default function MonitorPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const unread = state.monitorEvents.filter(e => !e.read).length;

  const events = state.monitorEvents.filter(e => {
    const comp = state.companies.find(c => c.id === e.companyId);
    const typeLabel = EVENT_TYPES[e.type] ?? '';
    return (
      comp?.name.toLowerCase().includes(search.toLowerCase()) ||
      typeLabel.toLowerCase().includes(search.toLowerCase())
    );
  });

  const columns = [
    {
      title: '',
      key: 'dot',
      width: 24,
      render: (_: unknown, record: MonitorEvent) =>
        !record.read ? (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff4d4f' }} />
        ) : null,
    },
    { title: 'Дата', dataIndex: 'date', key: 'date' },
    {
      title: 'Компания',
      key: 'company',
      render: (_: unknown, record: MonitorEvent) => {
        const comp = state.companies.find(c => c.id === record.companyId);
        return <span style={{ fontWeight: 550 }}>{comp?.shortName}</span>;
      },
    },
    {
      title: 'Тип изменения',
      key: 'type',
      render: (_: unknown, record: MonitorEvent) => (
        <Tag color={eventTagColor[record.type] ?? 'blue'}>{EVENT_TYPES[record.type] ?? record.type}</Tag>
      ),
    },
    { title: 'Было', dataIndex: 'old', key: 'old', render: (v: string) => <span style={{ color: '#ff4d4f', fontSize: 12 }}>{v}</span> },
    { title: 'Стало', dataIndex: 'newVal', key: 'newVal', render: (v: string) => <span style={{ color: '#52c41a', fontSize: 12 }}>{v}</span> },
    {
      title: '',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: MonitorEvent) =>
        !record.read ? (
          <Button
            type="text"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => dispatch({ type: 'MARK_READ', id: record.id })}
          >
            Прочитано
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Мониторинг компаний (Контур.Фокус)</Title>
      <Row gutter={10} style={{ marginBottom: 14 }}>
        <Col span={6}>
          <Card><Statistic title="Всего событий" value={state.monitorEvents.length} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Непрочитанных" value={unread} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Смена директора"
              value={state.monitorEvents.filter(e => e.type === 'ceo_change').length}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Компаний" value={state.companies.length} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
          <Input.Search placeholder="Поиск..." allowClear value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        </Space>
        <Table<MonitorEvent>
          rowKey="id"
          dataSource={events}
          columns={columns}
          pagination={false}
          size="middle"
          rowClassName={record => (!record.read ? 'monitor-row-unread' : '')}
          onRow={record => ({
            style: { background: record.read ? undefined : '#fffbe6' },
          })}
        />
      </Card>
    </div>
  );
}
