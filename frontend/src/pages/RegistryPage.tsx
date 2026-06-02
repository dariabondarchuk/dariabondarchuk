import { useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Input,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import type { Process } from '../types';

const { Title, Text } = Typography;

const TAB_ITEMS = [
  { key: 'processes', label: 'Процессы' },
  { key: 'is', label: 'Информационные системы' },
  { key: 'third', label: 'Третьи лица' },
  { key: 'sites', label: 'Инфо о сайтах' },
  { key: 'cross', label: 'Трансграничная передача' },
  { key: 'risks', label: 'Выявленные риски' },
  { key: 'servers', label: 'Серверы' },
];

const COUNT_LABELS: Record<string, string> = {
  less1k: 'менее 1 тыс.',
  less10k: 'менее 10 тыс.',
  less100k: 'менее 100 тыс.',
  more100k: 'более 100 тыс.',
};

export default function RegistryPage() {
  const { state } = useApp();
  const [tab, setTab] = useState('processes');
  const [search, setSearch] = useState('');

  const processes = state.processes.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { title: '№', dataIndex: 'id', key: 'id', width: 56 },
    {
      title: 'Название процесса',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <span style={{ fontWeight: 550, color: '#1677ff' }}>{v}</span>,
    },
    {
      title: 'Описание',
      key: 'description',
      render: (_: unknown, record: Process) => record.sections[1]?.data?.description || '—',
      ellipsis: true,
    },
    {
      title: 'Макроцель',
      key: 'macroGoal',
      render: (_: unknown, record: Process) => record.sections[2]?.data?.macroGoal || '—',
    },
    {
      title: 'Физ. лица',
      key: 'persons',
      render: (_: unknown, record: Process) => {
        const persons = record.sections[2]?.data?.persons;
        return persons ? <Tag>{persons}</Tag> : '—';
      },
    },
    {
      title: 'Кол-во',
      key: 'count',
      render: (_: unknown, record: Process) => {
        const count = record.sections[2]?.data?.count;
        return count ? (COUNT_LABELS[count] ?? count) : '—';
      },
    },
    {
      title: 'Согласие',
      key: 'consent',
      render: (_: unknown, record: Process) => (record.sections[5]?.data?.consentRequired ? 'Да' : '—'),
    },
    {
      title: 'Способ',
      key: 'legalBasis',
      render: (_: unknown, record: Process) => record.sections[5]?.data?.legalBasis || '—',
    },
  ];

  const tabLabel = TAB_ITEMS.find(t => t.key === tab)?.label ?? tab;

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Реестры</Title>
      <Card>
        <Tabs activeKey={tab} onChange={setTab} items={TAB_ITEMS} />
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
          <Input.Search placeholder="Поиск..." allowClear value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
          <Button icon={<FilterOutlined />}>Фильтры</Button>
          <Button icon={<DownloadOutlined />}>Скачать xlsx</Button>
          <div style={{ flex: 1 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>{processes.length} записей</Text>
        </Space>
        {tab === 'processes' ? (
          <Table<Process> rowKey="id" dataSource={processes} columns={columns} pagination={false} size="middle" scroll={{ x: true }} />
        ) : (
          <Empty description={`Раздел «${tabLabel}» — данные будут добавлены`} />
        )}
      </Card>
    </div>
  );
}
