import { useCallback, useEffect, useState } from 'react';
import { Card, Select, Table, Typography } from 'antd';
import type { TablePaginationConfig } from 'antd';
import { apiActions } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

const { Title, Text, Paragraph } = Typography;

export interface AuditEntry {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  entityLabel: string;
  actionLabel: string;
  summary: string;
  changes: unknown;
  createdAt: string;
  ipAddress?: string | null;
  user?: { name: string; email: string } | null;
}

const PAGE_SIZE = 30;

export default function SettingsPage() {
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState<string | undefined>();
  const [entityTypes, setEntityTypes] = useState<{ value: string; label: string }[]>([]);

  const loadAudit = useCallback(async (nextPage: number, entityType?: string) => {
    setLoading(true);
    try {
      const { data } = await apiActions.getAuditLog({
        limit: PAGE_SIZE,
        offset: (nextPage - 1) * PAGE_SIZE,
        entityType,
      });
      setAudit(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setAudit([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiActions.getAuditEntityTypes()
      .then(res => setEntityTypes((res.data ?? []) as { value: string; label: string }[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void loadAudit(page, entityFilter);
  }, [page, entityFilter, loadAudit]);

  const onTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1);
  };

  const columns = [
    {
      title: 'Дата и время',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => new Date(v).toLocaleString('ru-RU'),
    },
    {
      title: 'Пользователь',
      key: 'user',
      width: 180,
      render: (_: unknown, record: AuditEntry) =>
        record.user?.name || record.user?.email || (
          <Text type="secondary">Публичная ссылка / система</Text>
        ),
    },
    {
      title: 'Раздел',
      dataIndex: 'entityLabel',
      key: 'entityLabel',
      width: 170,
    },
    {
      title: 'Действие',
      dataIndex: 'actionLabel',
      key: 'actionLabel',
      width: 200,
    },
    {
      title: 'Описание',
      key: 'summary',
      render: (_: unknown, record: AuditEntry) => (
        <span>
          {record.summary || `ID ${record.entityId}`}
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            #{record.entityId}
          </Text>
        </span>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Настройки</Title>

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

      <Card
        title="История изменений"
        extra={(
          <Select
            allowClear
            placeholder="Все разделы"
            style={{ width: 220 }}
            value={entityFilter}
            onChange={v => {
              setEntityFilter(v);
              setPage(1);
            }}
            options={entityTypes}
          />
        )}
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Журнал фиксирует действия в сервисе: компании, процессы, анкеты, обращения, документы, уведомления РКН и проверки ЕГРЮЛ.
        </Paragraph>
        <Table<AuditEntry>
          rowKey="id"
          loading={loading}
          dataSource={audit}
          columns={columns}
          size="middle"
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: t => `Всего записей: ${t}`,
          }}
          onChange={onTableChange}
          expandable={{
            expandedRowRender: record => (
              <pre style={{ margin: 0, fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(record.changes, null, 2)}
              </pre>
            ),
            rowExpandable: record => Boolean(record.changes && Object.keys(record.changes as object).length),
          }}
        />
      </Card>
    </div>
  );
}
