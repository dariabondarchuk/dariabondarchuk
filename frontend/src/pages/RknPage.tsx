import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { DownloadOutlined, FileOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import type { RknNotification, RknFile } from '../types';

const { Title, Text } = Typography;

export default function RknPage() {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [showFiles, setShowFiles] = useState<RknNotification | null>(null);

  const notifications = state.rknNotifications.filter(n => {
    const comp = state.companies.find(c => c.id === n.companyId);
    return comp?.name.toLowerCase().includes(search.toLowerCase());
  });
  const submitted = notifications.filter(n => n.status === 'submitted').length;

  const columns = [
    {
      title: 'Компания',
      key: 'company',
      render: (_: unknown, record: RknNotification) => {
        const comp = state.companies.find(c => c.id === record.companyId);
        return <span style={{ fontWeight: 550 }}>{comp?.name}</span>;
      },
    },
    { title: 'Дата подачи', dataIndex: 'dateSubmit', key: 'dateSubmit', render: (v: string) => v || '—' },
    { title: 'Дата изменений', dataIndex: 'dateChange', key: 'dateChange', render: (v: string) => v || '—' },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'Документы',
      key: 'files',
      render: (_: unknown, record: RknNotification) =>
        record.files.length ? (
          <Button icon={<FileOutlined />} onClick={() => setShowFiles(record)}>
            {record.files.length}
          </Button>
        ) : (
          '—'
        ),
    },
  ];

  const renderFile = (f: RknFile, current: boolean) => (
    <div
      key={f.name}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px',
        background: current ? '#f6ffed' : '#fafafa',
        borderRadius: 7,
        border: `1px solid ${current ? '#b7eb8f' : '#e8e8e8'}`,
        marginBottom: 6,
      }}
    >
      <FileOutlined />
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: current ? 550 : 400 }}>{f.name}</span>
      <Text type="secondary" style={{ fontSize: 11 }}>{f.date}</Text>
      <Button type="text" icon={<DownloadOutlined />} />
    </div>
  );

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Реестр уведомлений РКН</Title>
      <Row gutter={10} style={{ marginBottom: 14 }}>
        <Col span={8}>
          <Card><Statistic title="Подано" value={submitted} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Не подано" value={notifications.length - submitted} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Всего компаний" value={notifications.length} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
      </Row>
      <Card>
        <Input.Search
          placeholder="Поиск..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 280, marginBottom: 16 }}
        />
        <Table<RknNotification> rowKey="id" dataSource={notifications} columns={columns} pagination={false} size="middle" />
      </Card>

      <Modal
        title={`Документы: ${state.companies.find(c => c.id === showFiles?.companyId)?.name ?? ''}`}
        open={!!showFiles}
        onCancel={() => setShowFiles(null)}
        footer={null}
        width={560}
      >
        {showFiles && (
          <>
            {showFiles.files.filter(f => f.current).length > 0 && (
              <>
                <Text strong style={{ color: '#52c41a', fontSize: 12, display: 'block', marginBottom: 8 }}>
                  Актуальная редакция
                </Text>
                {showFiles.files.filter(f => f.current).map(f => renderFile(f, true))}
              </>
            )}
            {showFiles.files.filter(f => !f.current).length > 0 && (
              <>
                <Text type="secondary" strong style={{ fontSize: 12, display: 'block', margin: '14px 0 8px' }}>
                  Архивные версии
                </Text>
                {showFiles.files.filter(f => !f.current).map(f => renderFile(f, false))}
              </>
            )}
            <div style={{ marginTop: 14, padding: '10px 12px', background: '#fffbe6', borderRadius: 7, border: '1px solid #ffe58f', fontSize: 12 }}>
              Стандарт именования: <b>Название_ДДММГГГГ.pdf</b>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
