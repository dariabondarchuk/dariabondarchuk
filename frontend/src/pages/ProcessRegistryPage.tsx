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
import type { Process } from '../types';

const { Title, Text } = Typography;

export type RegistryScopeFilter = 'all' | 'corporate' | 'companies' | number;

function filterRegistryProcesses(processes: Process[], scope: RegistryScopeFilter): Process[] {
  const base = processes.filter(p => !p.anketaType);
  if (scope === 'all') return base;
  if (scope === 'corporate') return base.filter(p => p.isCorporate);
  if (scope === 'companies') return base.filter(p => !p.isCorporate && p.companyId != null);
  return base.filter(p => !p.isCorporate && p.companyId === scope);
}

export default function ProcessRegistryPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<RegistryTabKey>('processes');
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<RegistryScopeFilter>('all');

  const companiesById = useMemo(
    () => new Map(state.companies.map(c => [c.id, c])),
    [state.companies],
  );

  const referenceCompany = useMemo(() => {
    if (typeof scope === 'number') return companiesById.get(scope);
    return state.companies[0];
  }, [scope, companiesById, state.companies]);

  const processes = useMemo(() => {
    let list = filterRegistryProcesses(state.processes, scope);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
    return list;
  }, [state.processes, scope, search]);

  const tableConfig = useMemo(() => {
    if (!referenceCompany) return { rows: [], columns: [], columnKeys: [] as string[] };
    return getRegistryTableConfig(tab, processes, referenceCompany, companiesById);
  }, [tab, processes, referenceCompany, companiesById]);

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
            onClick={() => {
              if (row.isCorporate) navigate('/corporate-processes');
              else if (row.companyId) navigate(`/processes/${row.companyId}`);
            }}
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              if (row.isCorporate) navigate('/corporate-processes');
              else if (row.companyId) navigate(`/processes/${row.companyId}`);
            }}
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

  const scopeOptions = [
    { value: 'all' as const, label: 'Все процессы' },
    { value: 'companies' as const, label: 'Все процессы компаний' },
    { value: 'corporate' as const, label: 'Общекорпоративные процессы' },
    ...state.companies.map(c => ({
      value: c.id,
      label: c.shortName || c.name,
    })),
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Реестр всех процессов
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Сводная таблица по процессам обработки ПДн компаний группы и общекорпоративным процессам
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
            value={scope}
            onChange={setScope}
            style={{ minWidth: 280 }}
            options={scopeOptions}
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
          scroll={{ x: tab === 'processes' ? 12400 : 2400 }}
          size="small"
          bordered
        />
      </Card>
    </div>
  );
}
