import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { apiActions } from '../api/client';
import {
  ANKETA_DISPLAY_STATUS_LABELS,
  filterProcessTags,
  formatAnketaDate,
  getProcessFillStatus,
} from '../utils/anketaDisplay';
import { getProcessDisplayName } from '../utils/processDisplay';
import ProcessSection1Fields from '../components/ProcessSection1Fields';
import ProcessSection2Fields from '../components/ProcessSection2Fields';
import ProcessSection3Fields from '../components/ProcessSection3Fields';
import ProcessSection4Fields from '../components/ProcessSection4Fields';
import ProcessSection5Fields from '../components/ProcessSection5Fields';
import ProcessSection6Fields from '../components/ProcessSection6Fields';
import ProcessSection7Fields from '../components/ProcessSection7Fields';
import ProcessSection8Fields from '../components/ProcessSection8Fields';
import ProcessSection9Fields from '../components/ProcessSection9Fields';
import { SECTION_NAMES, STATUS_MAP } from '../constants';
import type { AnketaDisplayStatus } from '../utils/anketaDisplay';
import { verifyProcess } from '../api/publicAnketa';
import api from '../api/client';
import type { Process } from '../types';

const { Text } = Typography;

const FILL_STATUS_OPTIONS: { value: AnketaDisplayStatus; label: string }[] = [
  { value: 'filled', label: 'Заполнено' },
  { value: 'partial', label: 'Частично заполнено' },
  { value: 'not_filled', label: 'Не заполнено' },
];

const WORKFLOW_STATUS_OPTIONS = [
  'not_sent',
  'sent',
  'filling',
  'review',
  'need_check',
  'verified',
  'accepted',
  'returned',
] as const;

interface ProcessFilters {
  fillStatus: AnketaDisplayStatus | null;
  tags: string[];
  workflowStatus: string | null;
}

const EMPTY_FILTERS: ProcessFilters = {
  fillStatus: null,
  tags: [],
  workflowStatus: null,
};

interface CompanyProcessesPanelProps {
  companyId?: number;
  corporateOnly?: boolean;
  panelTitle?: string | null;
}

export default function CompanyProcessesPanel({
  companyId,
  corporateOnly = false,
  panelTitle = 'Процессы обработки ПДн',
}: CompanyProcessesPanelProps) {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProcessFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editProcessId, setEditProcessId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState(1);
  const [renameProcess, setRenameProcess] = useState<Process | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [openingProcess, setOpeningProcess] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const company = companyId != null ? state.companies.find(c => c.id === companyId) : undefined;
  const editProcess = editProcessId != null ? state.processes.find(p => p.id === editProcessId) : null;

  const panelProcesses = useMemo(() => {
    if (corporateOnly) {
      return state.processes.filter(p => p.isCorporate && !p.anketaType);
    }
    return state.processes.filter(
      p => p.companyId === companyId && !p.isCorporate && !p.anketaType,
    );
  }, [state.processes, companyId, corporateOnly]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    panelProcesses.forEach(p => {
      filterProcessTags(p.tags ?? []).forEach(t => tags.add(t));
    });
    return [...tags].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [panelProcesses]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.fillStatus) n += 1;
    if (filters.tags.length) n += 1;
    if (filters.workflowStatus) n += 1;
    return n;
  }, [filters]);

  const processes = useMemo(() => {
    let list = panelProcesses;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p => getProcessDisplayName(p).toLowerCase().includes(q));
    }
    if (filters.fillStatus) {
      list = list.filter(p => getProcessFillStatus(p) === filters.fillStatus);
    }
    if (filters.tags.length) {
      list = list.filter(p => {
        const visible = filterProcessTags(p.tags ?? []);
        return filters.tags.every(t => visible.includes(t));
      });
    }
    if (filters.workflowStatus) {
      list = list.filter(p => p.status === filters.workflowStatus);
    }
    return list;
  }, [panelProcesses, search, filters]);

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  const filterPanel = (
    <div style={{ width: 300 }}>
      <Form layout="vertical" size="small">
        <Form.Item label="Статус заполнения" style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="Все"
            value={filters.fillStatus ?? undefined}
            options={FILL_STATUS_OPTIONS}
            onChange={v => setFilters(f => ({ ...f, fillStatus: (v as AnketaDisplayStatus) ?? null }))}
          />
        </Form.Item>
        <Form.Item label="Теги" style={{ marginBottom: 12 }}>
          <Select
            mode="multiple"
            allowClear
            placeholder={availableTags.length ? 'Любые' : 'Нет тегов'}
            disabled={!availableTags.length}
            value={filters.tags}
            options={availableTags.map(t => ({ value: t, label: t }))}
            onChange={tags => setFilters(f => ({ ...f, tags: tags as string[] }))}
          />
        </Form.Item>
        <Form.Item label="Статус процесса" style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="Все"
            value={filters.workflowStatus ?? undefined}
            options={WORKFLOW_STATUS_OPTIONS.map(key => ({
              value: key,
              label: STATUS_MAP[key]?.label ?? key,
            }))}
            onChange={v => setFilters(f => ({ ...f, workflowStatus: v ?? null }))}
          />
        </Form.Item>
        <Space>
          <Button size="small" onClick={resetFilters} disabled={!activeFilterCount}>
            Сбросить
          </Button>
          <Button type="primary" size="small" onClick={() => setFilterOpen(false)}>
            Применить
          </Button>
        </Space>
      </Form>
    </div>
  );

  const openProcess = async (record: Process) => {
    setOpeningProcess(true);
    try {
      const { data } = await apiActions.prefillProcessFromAnkety(record.id);
      const applied = (data as { prefillAppliedSections?: number[] }).prefillAppliedSections;
      const { prefillAppliedSections: _, ...process } = data as Process & { prefillAppliedSections?: number[] };
      dispatch({ type: 'REPLACE_PROCESS', process: process as Process });
      if (applied?.length) {
        message.info(`Подставлены данные из проверенных анкет (секции: ${applied.join(', ')})`);
      }
    } catch {
      // открываем процесс даже если подстановка не удалась
    } finally {
      setOpeningProcess(false);
      setEditProcessId(record.id);
      setActiveSection(1);
    }
  };

  const openRename = (record: Process) => {
    setRenameProcess(record);
    setRenameValue(getProcessDisplayName(record));
  };

  const deleteProcess = async (record: Process) => {
    setDeletingId(record.id);
    try {
      await dispatch({ type: 'DELETE_PROCESS', id: record.id });
      if (editProcessId === record.id) setEditProcessId(null);
      message.success('Процесс удалён');
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось удалить процесс');
    } finally {
      setDeletingId(null);
    }
  };

  const saveProcessRename = async () => {
    if (!renameProcess) return;
    const name = renameValue.trim();
    if (!name) {
      message.warning('Введите название процесса');
      return;
    }
    setRenaming(true);
    try {
      const { data } = await apiActions.updateProcess(renameProcess.id, { name });
      dispatch({ type: 'REPLACE_PROCESS', process: data as Process });
      if (editProcessId === renameProcess.id) {
        setEditProcessId(renameProcess.id);
      }
      setRenameProcess(null);
      message.success('Название процесса сохранено');
    } catch {
      message.error('Не удалось сохранить название');
    } finally {
      setRenaming(false);
    }
  };

  const updateSection = (section: number, data: Record<string, unknown>) => {
    if (!editProcess) return;
    dispatch({
      type: 'UPDATE_PROCESS_SECTION',
      processId: editProcess.id,
      section,
      status: 'filling',
      data,
    });
  };

  const saveProcessSection = async () => {
    if (!editProcess) return;
    const section = editProcess.sections[activeSection];
    await dispatch({
      type: 'SAVE_PROCESS_SECTION',
      processId: editProcess.id,
      section: activeSection,
      status: section?.status === 'not_filled' ? 'filling' : (section?.status ?? 'filling'),
      data: section?.data || {},
    });
    message.success('Секция сохранена');
  };

  const handleVerify = async (record: Process) => {
    try {
      const result = await verifyProcess(record.id);
      dispatch({ type: 'REPLACE_PROCESS', process: result.process as Process });
      if (record.anketaType) {
        const { data: companyData } = await api.get(`/companies/${record.companyId}`);
        dispatch({ type: 'UPDATE_COMPANY', id: record.companyId, data: companyData });
        const { data: respData } = await api.get(`/companies/${record.companyId}/responsible`);
        if (respData) {
          dispatch({ type: 'UPDATE_RESPONSIBLE', id: respData.id, data: respData });
        }
      }
      message.success('Статус изменён на «Проверено»');
    } catch {
      message.error('Не удалось обновить статус');
    }
  };

  const processColumns = [
    {
      title: '№',
      key: 'num',
      width: 56,
      render: (_: unknown, __: Process, index: number) => index + 1,
    },
    {
      title: 'Название',
      key: 'name',
      render: (_: unknown, record: Process) => (
        <Space size={4}>
          <span style={{ fontWeight: 550, color: '#1677ff' }}>
            {getProcessDisplayName(record)}
          </span>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title="Изменить название"
            aria-label="Изменить название"
            onClick={e => {
              e.stopPropagation();
              openRename(record);
            }}
          />
          <Popconfirm
            title="Удалить процесс?"
            description={getProcessDisplayName(record)}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteProcess(record)}
            onPopupClick={e => e.stopPropagation()}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              title="Удалить процесс"
              aria-label="Удалить процесс"
              loading={deletingId === record.id}
              onClick={e => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
    {
      title: 'Теги',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => {
        const visible = filterProcessTags(tags ?? []);
        return visible.length ? visible.map(t => <Tag key={t}>{t}</Tag>) : '—';
      },
    },
    {
      title: 'Статус',
      key: 'fillStatus',
      width: 220,
      render: (_: unknown, record: Process) => (
        <Space size={8} onClick={e => e.stopPropagation()}>
          <Text>{ANKETA_DISPLAY_STATUS_LABELS[getProcessFillStatus(record)]}</Text>
          {record.status === 'need_check' && (
            <Button type="primary" size="small" onClick={() => handleVerify(record)}>
              Проверено
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: 'Дата загрузки',
      key: 'createdAt',
      width: 130,
      render: (_: unknown, record: Process) => (
        <Text type="secondary">{formatAnketaDate(record.createdAt)}</Text>
      ),
    },
    {
      title: 'Дата обновления',
      key: 'updatedAt',
      width: 140,
      render: (_: unknown, record: Process) => (
        <Text type="secondary">{formatAnketaDate(record.updatedAt)}</Text>
      ),
    },
  ];

  const sectionTabItems = Object.entries(SECTION_NAMES).map(([n, name]) => ({
    key: n,
    label: (
      <Space size={4}>
        <span>{n}. {name.split(' ')[0]}</span>
        <StatusBadge status={editProcess?.sections[+n]?.status || 'not_filled'} />
      </Space>
    ),
  }));

  const renderSectionForm = () => {
    if (!editProcess) return null;
    const s1 = editProcess.sections[1]?.data;
    const s2 = editProcess.sections[2]?.data;
    const s3 = editProcess.sections[3]?.data;
    const s4 = editProcess.sections[4]?.data;
    const s5 = editProcess.sections[5]?.data;
    const s6 = editProcess.sections[6]?.data;
    const s7 = editProcess.sections[7]?.data;
    const s8 = editProcess.sections[8]?.data;
    const s9 = editProcess.sections[9]?.data;
    const allOffices = corporateOnly
      ? state.companies.flatMap(c => c.offices ?? [])
      : (company?.offices ?? []);
    const departmentSuggestions = allOffices
      .map(o => o.name?.trim())
      .filter((n): n is string => Boolean(n));
    const personGroupSuggestions = Array.isArray(s2?.personGroups)
      ? s2.personGroups.map(String)
      : typeof s2?.persons === 'string' && s2.persons
        ? s2.persons.split(/[,;]/).map(s => s.trim()).filter(Boolean)
        : [];
    const sourceSubjectSuggestions = Array.isArray(s4?.sourceSubjects)
      ? s4.sourceSubjects.map(s => String(s.subject || '')).filter(Boolean)
      : [];
    const subjectSuggestionsFor5 = Array.from(new Set([...personGroupSuggestions, ...sourceSubjectSuggestions]));
    const storageLocationSuggestions = allOffices.flatMap(o => {
      const parts = [o.name?.trim(), o.address?.trim()].filter(Boolean);
      return parts.length ? [parts.join(' — ')] : [];
    });
    const allSites = corporateOnly
      ? state.companies.flatMap(c => c.sites ?? [])
      : (company?.sites ?? []);
    const allApps = corporateOnly
      ? state.companies.flatMap(c => c.apps ?? [])
      : (company?.apps ?? []);
    const systemSuggestions = [
      ...allSites.map(s => (s.url ? `${s.name} (${s.url})` : s.name)).filter(Boolean),
      ...allApps.map(a => (a.url ? `${a.name} — ${a.url}` : `${a.name} (приложение)`)).filter(Boolean),
    ];
    const pdDataSuggestions = [
      ...(Array.isArray(s5?.pdCategories) ? s5.pdCategories.map(String) : []),
      ...(Array.isArray(s4?.sourceSubjects)
        ? s4.sourceSubjects.flatMap(s => (Array.isArray(s.personalData) ? s.personalData.map(String) : []))
        : []),
    ];

    if (activeSection === 1) {
      return (
        <ProcessSection1Fields
          data={s1}
          onChange={patch => updateSection(1, patch)}
        />
      );
    }

    if (activeSection === 2) {
      return (
        <ProcessSection2Fields
          data={s2}
          onChange={patch => updateSection(2, patch)}
        />
      );
    }

    if (activeSection === 3) {
      return (
        <ProcessSection3Fields
          data={s3}
          onChange={patch => updateSection(3, patch)}
          suggestions={departmentSuggestions}
        />
      );
    }

    if (activeSection === 4) {
      return (
        <ProcessSection4Fields
          data={s4}
          onChange={patch => updateSection(4, patch)}
          subjectSuggestions={personGroupSuggestions}
          personalDataSuggestions={pdDataSuggestions}
        />
      );
    }

    if (activeSection === 5) {
      return (
        <ProcessSection5Fields
          data={s5}
          onChange={patch => updateSection(5, patch)}
          subjectSuggestions={subjectSuggestionsFor5}
          personalDataSuggestions={pdDataSuggestions}
        />
      );
    }

    if (activeSection === 6) {
      return (
        <ProcessSection6Fields
          data={s6}
          onChange={patch => updateSection(6, patch)}
          storageLocationSuggestions={storageLocationSuggestions}
        />
      );
    }

    if (activeSection === 7) {
      return (
        <ProcessSection7Fields
          data={s7}
          onChange={patch => updateSection(7, patch)}
          systemSuggestions={systemSuggestions}
        />
      );
    }

    if (activeSection === 8) {
      return (
        <ProcessSection8Fields
          data={s8}
          onChange={patch => updateSection(8, patch)}
        />
      );
    }

    if (activeSection === 9) {
      return (
        <ProcessSection9Fields
          data={s9}
          onChange={patch => updateSection(9, patch)}
        />
      );
    }

    return null;
  };

  if (!corporateOnly && !company) return null;

  return (
    <>
      <Card title={panelTitle ?? undefined}>
        <Space style={{ marginBottom: 16, width: '100%' }} wrap align="center">
          <Input.Search
            placeholder="Поиск..."
            allowClear
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Popover
            content={filterPanel}
            title="Фильтры"
            trigger="click"
            open={filterOpen}
            onOpenChange={setFilterOpen}
            placement="bottomLeft"
          >
            <Badge count={activeFilterCount} size="small" offset={[-4, 4]}>
              <Button icon={<FilterOutlined />} type={activeFilterCount ? 'primary' : 'default'}>
                Фильтры
              </Button>
            </Badge>
          </Popover>
          {(activeFilterCount > 0 || search.trim()) && (
            <Text type="secondary">
              Показано: {processes.length} из {panelProcesses.length}
            </Text>
          )}
          <div style={{ flex: 1 }} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={openingProcess}
            onClick={async () => {
              setOpeningProcess(true);
              try {
                const result = await dispatch({
                  type: 'ADD_PROCESS',
                  companyId: corporateOnly ? null : companyId,
                  isCorporate: corporateOnly,
                  name: 'Новый процесс',
                }) as (Process & { prefillAppliedSections?: number[] }) | undefined;
                const created = result && typeof result === 'object' && 'id' in result
                  ? result as Process & { prefillAppliedSections?: number[] }
                  : undefined;
                if (!created?.id) {
                  message.error('Не удалось создать процесс');
                  return;
                }
                const applied = created.prefillAppliedSections;
                if (applied?.length) {
                  message.success(`Процесс создан. Подставлены данные из анкет (секции: ${applied.join(', ')})`);
                } else {
                  message.success('Процесс создан');
                }
                setEditProcessId(created.id);
                setActiveSection(1);
              } catch (err) {
                const msg = err && typeof err === 'object' && 'response' in err
                  ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
                  : undefined;
                message.error(msg || 'Не удалось создать процесс');
              } finally {
                setOpeningProcess(false);
              }
            }}
          >
            Добавить
          </Button>
        </Space>
        <Table<Process>
          rowKey="id"
          dataSource={processes}
          columns={processColumns}
          pagination={false}
          size="middle"
          loading={openingProcess}
          onRow={record => ({
            onClick: () => openProcess(record),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Modal
        title="Название процесса"
        open={!!renameProcess}
        onCancel={() => setRenameProcess(null)}
        onOk={saveProcessRename}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={renaming}
        destroyOnClose
      >
        <Input
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onPressEnter={saveProcessRename}
          placeholder="Введите название процесса"
          maxLength={200}
        />
      </Modal>

      <Modal
        title={editProcess ? (
          <Space>
            <span>{getProcessDisplayName(editProcess)}</span>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              title="Изменить название"
              onClick={() => openRename(editProcess)}
            />
          </Space>
        ) : ''}
        open={!!editProcess}
        onCancel={() => setEditProcessId(null)}
        footer={null}
        width={1100}
        destroyOnClose
        styles={{ body: { paddingTop: 12 } }}
      >
        {editProcess && (
          <>
            <Tabs activeKey={String(activeSection)} onChange={k => setActiveSection(+k)} items={sectionTabItems} size="small" style={{ marginBottom: 16 }} />
            <div style={{ marginBottom: 16 }}>
              {Object.entries(SECTION_NAMES).map(([n, name]) => (
                <div
                  key={n}
                  onClick={() => setActiveSection(+n)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '9px 14px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: +n === activeSection ? '#e6f4ff' : 'transparent',
                  }}
                >
                  <span style={{ fontWeight: +n === activeSection ? 600 : 400 }}>{n}. {name}</span>
                  <StatusBadge status={editProcess.sections[+n]?.status || 'not_filled'} />
                </div>
              ))}
            </div>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Text strong style={{ color: '#1677ff', display: 'block', marginBottom: 12 }}>
                {activeSection}. {SECTION_NAMES[activeSection]}
              </Text>
              <Form layout="vertical">{renderSectionForm()}</Form>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 16,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <Space>
                  <Button
                    type="primary"
                    onClick={async () => {
                      await saveProcessSection();
                      if (activeSection < 9) setActiveSection(activeSection + 1);
                    }}
                  >
                    Продолжить
                  </Button>
                  <Button
                    onClick={async () => {
                      await saveProcessSection();
                      setEditProcessId(null);
                    }}
                  >
                    Сохранить и закрыть
                  </Button>
                </Space>
                <StatusBadge status={editProcess.sections[activeSection]?.status || 'not_filled'} />
              </div>
            </Card>
          </>
        )}
      </Modal>
    </>
  );
}
