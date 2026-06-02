import { useMemo, useState } from 'react';
import { Button, Card, Input, Select, Space, Table, Tabs, Typography } from 'antd';
import {
  DownloadOutlined,
  FilterOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  exportRegistryCsv,
  getRegistryTableConfig,
  REGISTRY_TABS,
  type RegistryTabKey,
} from '../constants/registryColumns';
import type { ProcessRegistryRow } from '../utils/registryData';

const { Title, Text } = Typography;

export default function ProcessRegistryPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<RegistryTabKey>('processes');
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState<number | 'all'>('all');

  const company = useMemo(() => {
    if (companyId === 'all') return state.companies[0];
    return state.companies.find(c => c.id === companyId);
  }, [state.companies, companyId]);

  const processes = useMemo(() => {
    let list = state.processes;
    if (companyId !== 'all') list = list.filter(p => p.companyId === companyId);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
    return list;
  }, [state.processes, companyId, search]);

  const tableConfig = useMemo(() => {
    if (!company) return { rows: [], columns: [], columnKeys: [] as string[] };
    return getRegistryTableConfig(tab, processes, company);
  }, [tab, processes, company]);

  const columnsWithLink = useMemo(() => {
    if (tab !== 'processes') return tableConfig.columns;
    return tableConfig.columns.map(col => {
      if (col.key !== 'processName') return col;
      return {
        ...col,
        render: (_: unknown, row: ProcessRegistryRow) => (
          <span
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/processes/${row.companyId}`)}
            onKeyDown={e => e.key === 'Enter' && navigate(`/processes/${row.companyId}`)}
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              background: '#e6f4ff',
              color: '#1677ff',
              borderRadius: 4,
              fontWeight: 550,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {row.processName}
          </span>
        ),
      };
    });
  }, [tableConfig.columns, tab, navigate]);

  const exportCsv = () => {
    const cols = tableConfig.columnKeys
      .filter(k => k !== 'num')
      .map(k => {
        const def = tableConfig.columns.find(c => c.key === k);
        return { key: k, title: String(def?.title ?? k) };
      });
    exportRegistryCsv(tableConfig.rows as Record<string, unknown>[], cols);
  };

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Реестр процессов
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Сводная таблица по всем заполненным анкетам процессов обработки ПДн
      </Text>

      <Card>
        <Tabs
          activeKey={tab}
          onChange={k => setTab(k as RegistryTabKey)}
          items={REGISTRY_TABS.map(t => ({ key: t.key, label: t.label }))}
          style={{ marginBottom: 12 }}
        />

        <Space wrap style={{ marginBottom: 16, width: '100%' }}>
          <Select
            value={companyId}
            onChange={setCompanyId}
            style={{ minWidth: 220 }}
            options={[
              { value: 'all', label: 'Все компании' },
              ...state.companies.map(c => ({
                value: c.id,
                label: c.shortName || c.name,
              })),
            ]}
          />
          <Input.Search
            placeholder="Поиск по названию процесса..."
            allowClear
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <Button icon={<FilterOutlined />}>Фильтры</Button>
          <Button icon={<TableOutlined />}>Показать / скрыть колонки</Button>
          <Button icon={<DownloadOutlined />} onClick={exportCsv}>
            Скачать xlsx
          </Button>
          <Text type="secondary">{tableConfig.rows.length} записей</Text>
        </Space>

        <Table
          rowKey={row =>
            tab === 'processes'
              ? String((row as ProcessRegistryRow).processId)
              : `${(row as { processName?: string }).processName}-${(row as { num: number }).num}`
          }
          dataSource={tableConfig.rows}
          columns={columnsWithLink}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `Всего: ${t}` }}
          scroll={{ x: tab === 'processes' ? 12000 : 2400 }}
          size="small"
          bordered
        />
      </Card>
    </div>
  );
}
