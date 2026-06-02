import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { FilterOutlined, PlusOutlined, SendOutlined, CopyOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import ProcessSection1Fields from '../components/ProcessSection1Fields';
import ProcessSection2Fields from '../components/ProcessSection2Fields';
import ProcessSection3Fields from '../components/ProcessSection3Fields';
import ProcessSection4Fields from '../components/ProcessSection4Fields';
import ProcessSection5Fields from '../components/ProcessSection5Fields';
import ProcessSection6Fields from '../components/ProcessSection6Fields';
import ProcessSection7Fields from '../components/ProcessSection7Fields';
import ProcessSection8Fields from '../components/ProcessSection8Fields';
import ProcessSection9Fields from '../components/ProcessSection9Fields';
import { SECTION_NAMES } from '../constants';
import { verifyProcess } from '../api/publicAnketa';
import { createProcessInvite } from '../api/publicSurvey';
import api from '../api/client';
import type { Process } from '../types';

const { Text } = Typography;
const { TextArea } = Input;

interface CompanyProcessesPanelProps {
  companyId: number;
}

export default function CompanyProcessesPanel({ companyId }: CompanyProcessesPanelProps) {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [editProcessId, setEditProcessId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState(1);
  const [sendProcess, setSendProcess] = useState<Process | null>(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [sendForm] = Form.useForm();

  const company = state.companies.find(c => c.id === companyId);
  const editProcess = editProcessId != null ? state.processes.find(p => p.id === editProcessId) : null;

  const processes = state.processes.filter(
    p => p.companyId === companyId && p.name.toLowerCase().includes(search.toLowerCase()),
  );

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

  const closeSendModal = () => {
    setSendProcess(null);
    setInviteUrl('');
    sendForm.resetFields();
  };

  const handleSendInvite = async () => {
    if (!sendProcess) return;
    const values = await sendForm.validateFields();
    setSendingInvite(true);
    try {
      const result = await createProcessInvite(sendProcess.id, values.email, values.comment);
      setInviteUrl(result.url);
      if ('process' in result && result.process) {
        dispatch({ type: 'REPLACE_PROCESS', process: result.process as Process });
      }
      message.success('Ссылка создана — скопируйте и отправьте сотруднику');
    } catch {
      message.error('Не удалось создать ссылку');
    } finally {
      setSendingInvite(false);
    }
  };

  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      message.success('Ссылка скопирована');
    } catch {
      message.info(inviteUrl);
    }
  };

  const processColumns = [
    { title: '№', dataIndex: 'id', key: 'id', width: 56 },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, record: Process) => (
        <span
          style={{ fontWeight: 550, color: '#1677ff', cursor: 'pointer' }}
          onClick={() => {
            setEditProcessId(record.id);
            setActiveSection(1);
          }}
        >
          {v}
        </span>
      ),
    },
    {
      title: 'Теги',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => tags.map(t => <Tag key={t}>{t}</Tag>),
    },
    { title: 'Отправлено', dataIndex: 'sentAt', key: 'sentAt', render: (v: string) => v || '—' },
    { title: 'Кому', dataIndex: 'sentTo', key: 'sentTo', render: (v: string) => v || '—' },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Process) =>
        record.status === 'need_check' ? (
          <Button type="primary" size="small" onClick={() => handleVerify(record)}>
            Проверено
          </Button>
        ) : (
          <Button type="text" icon={<SendOutlined />} title="Отправить" onClick={() => setSendProcess(record)} />
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
    const departmentSuggestions = (company?.offices ?? [])
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
    const storageLocationSuggestions = (company?.offices ?? []).flatMap(o => {
      const parts = [o.name?.trim(), o.address?.trim()].filter(Boolean);
      return parts.length ? [parts.join(' — ')] : [];
    });
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

  if (!company) return null;

  return (
    <>
      <Card title="Процессы обработки ПДн">
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
          <Input.Search placeholder="Поиск..." allowClear value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
          <Button icon={<FilterOutlined />}>Фильтры</Button>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => dispatch({ type: 'ADD_PROCESS', companyId, name: 'Новый процесс' })}>
            Добавить
          </Button>
        </Space>
        <Table<Process> rowKey="id" dataSource={processes} columns={processColumns} pagination={false} size="middle" />
      </Card>

      <Modal
        title={editProcess?.name}
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
                  <Button onClick={() => setEditProcessId(null)}>Закрыть</Button>
                </Space>
                <StatusBadge status={editProcess.sections[activeSection]?.status || 'not_filled'} />
              </div>
            </Card>
          </>
        )}
      </Modal>

      <Modal
        title={`Отправить: ${sendProcess?.name ?? ''}`}
        open={!!sendProcess}
        onCancel={closeSendModal}
        onOk={inviteUrl ? closeSendModal : handleSendInvite}
        okText={inviteUrl ? 'Готово' : 'Создать ссылку'}
        okButtonProps={{ icon: inviteUrl ? undefined : <SendOutlined />, loading: sendingInvite }}
        cancelText="Отмена"
      >
        {!inviteUrl ? (
          <Form form={sendForm} layout="vertical">
            <Form.Item name="email" label="Email сотрудника">
              <Input placeholder="ivanov@samolet.ru" />
            </Form.Item>
            <Form.Item name="comment" label="Комментарий">
              <TextArea rows={3} placeholder="Пожалуйста, заполните анкету..." />
            </Form.Item>
          </Form>
        ) : (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Отправьте ссылку сотруднику для заполнения анкеты процесса:
            </Text>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={inviteUrl} readOnly />
              <Button icon={<CopyOutlined />} onClick={copyInviteUrl}>
                Копировать
              </Button>
            </Space.Compact>
          </>
        )}
      </Modal>
    </>
  );
}
