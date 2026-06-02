import { useState } from 'react';
import {
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  EyeOutlined,
  FilterOutlined,
  PlusOutlined,
  SendOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { SECTION_NAMES } from '../constants';
import { createProcessInvite } from '../api/publicSurvey';
import { getMockAppCache } from '../api/mockSurvey';
import type { Company, Process, Responsible } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ACTIVITIES = ['Строительство', 'IT', 'Финансы', 'Торговля'];
const MACRO_GOALS = [
  'Ведение основной деятельности',
  'Управление персоналом',
  'Маркетинг',
  'Финансовый учёт',
  'Безопасность',
];
const COUNT_OPTIONS = [
  { value: 'less1k', label: 'менее 1 тыс.' },
  { value: 'less10k', label: 'менее 10 тыс.' },
  { value: 'less100k', label: 'менее 100 тыс.' },
  { value: 'more100k', label: 'более 100 тыс.' },
];
const LEGAL_BASIS_OPTIONS = [
  'Согласие субъекта',
  'Договор',
  'Трудовой договор',
  'Закон',
  'Жизненно важные интересы',
];

const RESP_CHECKBOXES: { key: keyof Responsible; label: string }[] = [
  { key: 'isSecurity', label: 'Также является ответственным за обеспечение безопасности ПДн в ИС' },
  { key: 'controlsCompliance', label: 'Осуществляет внутренний контроль за соблюдением оператором и его работниками законодательства РФ о ПДн' },
  { key: 'informsEmployees', label: 'Доводит до работников оператора положения законодательства РФ о ПДн' },
  { key: 'handlesRequests', label: 'Организован приём и обработка обращений и запросов субъектов ПДн' },
];

export default function AnketyPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [editRespOpen, setEditRespOpen] = useState(false);
  const [editProcessId, setEditProcessId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState(1);
  const [sendProcess, setSendProcess] = useState<Process | null>(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [companyForm] = Form.useForm();
  const [respForm] = Form.useForm();
  const [sendForm] = Form.useForm();

  const company = state.companies[0];
  const resp = state.responsibles.find(r => r.companyId === company?.id);
  const editProcess = editProcessId != null ? state.processes.find(p => p.id === editProcessId) : null;

  const processes = state.processes.filter(
    p =>
      p.companyId === company?.id &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const mainRows = [
    {
      key: '1',
      num: 1,
      name: 'Информация о компании',
      status: company?.inn ? 'filling' : 'not_filled',
      onClick: () => {
        if (!company) return;
        companyForm.setFieldsValue({
          ...company,
          pdStartDate: company.pdStartDate ? dayjs(company.pdStartDate) : null,
        });
        setEditCompanyOpen(true);
      },
    },
    {
      key: '2',
      num: 2,
      name: 'Ответственные за обработку и защиту ПДн',
      status: resp?.fio ? 'filled' : 'not_filled',
      onClick: () => {
        const draft = resp
          ? { ...resp }
          : {
              id: 0,
              companyId: company!.id,
              role: 'organizer',
              fio: '',
              position: '',
              email: '',
              phone: '',
              isSecurity: false,
              controlsCompliance: false,
              informsEmployees: false,
              handlesRequests: false,
            };
        respForm.setFieldsValue(draft);
        setEditRespOpen(true);
      },
    },
    {
      key: '3',
      num: 3,
      name: 'Сайты и мобильные приложения',
      status: company?.sites?.length ? 'filled' : 'not_filled',
      onClick: undefined,
    },
    {
      key: '4',
      num: 4,
      name: 'Отделы и должности',
      status: 'not_filled',
      onClick: undefined,
    },
  ];

  const mainColumns = [
    { title: '№', dataIndex: 'num', key: 'num', width: 56 },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, row: (typeof mainRows)[0]) => (
        <span
          style={{ fontWeight: 550, color: row.onClick ? '#1677ff' : undefined, cursor: row.onClick ? 'pointer' : 'default' }}
          onClick={row.onClick}
        >
          {v}
        </span>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: '',
      key: 'view',
      width: 48,
      render: (_: unknown, row: (typeof mainRows)[0]) =>
        row.onClick ? (
          <Button type="text" icon={<EyeOutlined />} onClick={row.onClick} />
        ) : (
          <Button type="text" icon={<EyeOutlined />} disabled />
        ),
    },
  ];

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
      key: 'send',
      width: 48,
      render: (_: unknown, record: Process) => (
        <Button type="text" icon={<SendOutlined />} title="Отправить" onClick={() => setSendProcess(record)} />
      ),
    },
  ];

  const saveCompany = (values: Company & { pdStartDate?: dayjs.Dayjs }) => {
    if (!company) return;
    const data: Partial<Company> = {
      ...values,
      pdStartDate: values.pdStartDate
        ? (values.pdStartDate as dayjs.Dayjs).format('YYYY-MM-DD')
        : company.pdStartDate,
    };
    dispatch({ type: 'UPDATE_COMPANY', id: company.id, data });
    message.success('Данные компании сохранены');
    setEditCompanyOpen(false);
  };

  const saveResponsible = (values: Responsible) => {
    dispatch({ type: 'UPDATE_RESPONSIBLE', id: values.id, data: values });
    message.success('Данные ответственного сохранены');
    setEditRespOpen(false);
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
      if (localStorage.getItem('token') === 'mock-dev-token') {
        const cache = getMockAppCache();
        const updated = cache?.processes.find(p => p.id === sendProcess.id);
        if (updated) dispatch({ type: 'REPLACE_PROCESS', process: updated });
      } else if ('process' in result && result.process) {
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
    const s5 = editProcess.sections[5]?.data;

    if (activeSection === 1) {
      return (
        <>
          <Form.Item label="Описание процесса">
            <TextArea
              rows={3}
              value={s1?.description || ''}
              onChange={e => updateSection(1, { description: e.target.value })}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Контактное лицо">
                <Input
                  value={s1?.contactName || ''}
                  onChange={e => updateSection(1, { contactName: e.target.value })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email">
                <Input
                  value={s1?.contactEmail || ''}
                  onChange={e => updateSection(1, { contactEmail: e.target.value })}
                />
              </Form.Item>
            </Col>
          </Row>
        </>
      );
    }

    if (activeSection === 2) {
      return (
        <>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Макроцель">
                <Select
                  placeholder="Выберите..."
                  value={s2?.macroGoal || undefined}
                  onChange={v => updateSection(2, { macroGoal: v })}
                  options={MACRO_GOALS.map(g => ({ value: g, label: g }))}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Цель обработки ПДн">
                <Input
                  value={s2?.goal || ''}
                  onChange={e => updateSection(2, { goal: e.target.value })}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Категории физ. лиц">
                <Input
                  value={s2?.persons || ''}
                  onChange={e => updateSection(2, { persons: e.target.value })}
                  placeholder="Клиенты, сотрудники..."
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Количество">
                <Select
                  placeholder="Выберите..."
                  value={s2?.count || undefined}
                  onChange={v => updateSection(2, { count: v })}
                  options={COUNT_OPTIONS}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>
        </>
      );
    }

    if (activeSection === 5) {
      return (
        <>
          <Form.Item label="Состав ПДн (через запятую)">
            <Input
              value={s5?.pdCategories?.join(', ') || ''}
              onChange={e =>
                updateSection(5, {
                  pdCategories: e.target.value.split(',').map(x => x.trim()),
                })
              }
              placeholder="ФИО, адрес, телефон, email..."
            />
          </Form.Item>
          <Space style={{ marginBottom: 12 }}>
            <Checkbox
              checked={!!s5?.specialCategories}
              onChange={e => updateSection(5, { specialCategories: e.target.checked })}
            >
              Спецкатегории
            </Checkbox>
            <Checkbox
              checked={!!s5?.biometric}
              onChange={e => updateSection(5, { biometric: e.target.checked })}
            >
              Биометрические
            </Checkbox>
          </Space>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Правовое основание">
                <Select
                  placeholder="Выберите..."
                  value={s5?.legalBasis || undefined}
                  onChange={v => updateSection(5, { legalBasis: v })}
                  options={LEGAL_BASIS_OPTIONS.map(o => ({ value: o, label: o }))}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Срок хранения">
                <Input
                  value={s5?.retentionPeriod || ''}
                  onChange={e => updateSection(5, { retentionPeriod: e.target.value })}
                  placeholder="5 лет"
                />
              </Form.Item>
            </Col>
          </Row>
        </>
      );
    }

    return (
      <Text type="secondary" style={{ display: 'block', padding: '20px 0' }}>
        Форма секции «{SECTION_NAMES[activeSection]}» — заполните данные
      </Text>
    );
  };

  if (!company) return null;

  return (
    <div>
      <Breadcrumb
        items={[{ title: 'Компании' }, { title: company.shortName }]}
        style={{ marginBottom: 8 }}
      />
      <Title level={3} style={{ marginTop: 0 }}>Анкеты</Title>

      <Card title="Основные анкеты" style={{ marginBottom: 16 }}>
        <Table
          rowKey="key"
          dataSource={mainRows}
          columns={mainColumns}
          pagination={false}
          size="middle"
          onRow={row => ({ onClick: row.onClick, style: { cursor: row.onClick ? 'pointer' : 'default' } })}
        />
      </Card>

      <Card title="Процессы обработки ПДн">
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
          <Input.Search
            placeholder="Поиск..."
            allowClear
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Button icon={<FilterOutlined />}>Фильтры</Button>
          <div style={{ flex: 1 }} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => dispatch({ type: 'ADD_PROCESS', companyId: company.id, name: 'Новый процесс' })}
          >
            Добавить
          </Button>
        </Space>
        <Table<Process> rowKey="id" dataSource={processes} columns={processColumns} pagination={false} size="middle" />
      </Card>

      <Modal
        title="Анкета информации о компании"
        open={editCompanyOpen}
        onCancel={() => setEditCompanyOpen(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form form={companyForm} layout="vertical" onFinish={saveCompany}>
          <Text strong style={{ color: '#1677ff', display: 'block', marginBottom: 14 }}>
            1. Основная информация
          </Text>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="inn" label="ИНН (10 цифр)">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ogrn" label="ОГРН">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="okved" label="ОКВЭД">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="Полное наименование">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shortName" label="Сокращённое наименование">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="activity" label="Вид деятельности">
                <Select options={ACTIVITIES.map(a => ({ value: a, label: a }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="pdStartDate" label="Дата начала обработки ПДн">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isOperator" valuePropName="checked">
            <Checkbox>Организация числится в реестре операторов ПДн</Checkbox>
          </Form.Item>
          <Form.Item name="hasCrossBorder" valuePropName="checked">
            <Checkbox>Организация подала уведомление о трансграничной передаче ПДн</Checkbox>
          </Form.Item>
          <Text strong style={{ color: '#1677ff', display: 'block', margin: '20px 0 14px' }}>
            2. Контактная информация
          </Text>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="phone" label="Контактный телефон *">
                <Input placeholder="+7 (999) 999-99-99" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Контактный Email *">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="ceoPosition" label="Должность руководителя *">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ceo" label="ФИО руководителя *">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="city" label="Населённый пункт *">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactEmail" label="Email контактного лица">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="legalAddress" label="Юридический адрес *">
            <Input />
          </Form.Item>
          <Form.Item name="postalAddress" label="Почтовый адрес *">
            <Input placeholder="Совпадает с юридическим" />
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditCompanyOpen(false)}>Закрыть</Button>
            <Button type="primary" htmlType="submit">Сохранить</Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="Ответственные за обработку и защиту ПДн"
        open={editRespOpen}
        onCancel={() => setEditRespOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form form={respForm} layout="vertical" onFinish={saveResponsible}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="companyId" hidden><Input /></Form.Item>
          <Form.Item name="role" hidden><Input /></Form.Item>
          <Text strong style={{ color: '#1677ff', display: 'block', marginBottom: 14 }}>
            1. Ответственный за организацию обработки ПДн
          </Text>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fio" label="ФИО ответственного">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="position" label="Должность">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="email" label="Контактный Email">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Контактный телефон">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          {RESP_CHECKBOXES.map(({ key, label }) => (
            <Form.Item key={key} name={key} valuePropName="checked">
              <Checkbox>{label}</Checkbox>
            </Form.Item>
          ))}
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditRespOpen(false)}>Закрыть</Button>
            <Button type="primary" htmlType="submit">Сохранить</Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={editProcess?.name}
        open={!!editProcess}
        onCancel={() => setEditProcessId(null)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {editProcess && (
          <>
            <Tabs
              activeKey={String(activeSection)}
              onChange={k => setActiveSection(+k)}
              items={sectionTabItems}
              size="small"
              style={{ marginBottom: 16 }}
            />
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
                  <span style={{ fontWeight: +n === activeSection ? 600 : 400 }}>
                    {n}. {name}
                  </span>
                  <StatusBadge status={editProcess.sections[+n]?.status || 'not_filled'} />
                </div>
              ))}
            </div>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Text strong style={{ color: '#1677ff', display: 'block', marginBottom: 12 }}>
                {activeSection}. {SECTION_NAMES[activeSection]}
              </Text>
              <Form layout="vertical">{renderSectionForm()}</Form>
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <Button type="primary" onClick={saveProcessSection}>
                  Сохранить секцию
                </Button>
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
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Отправьте эту ссылку сотруднику. Для заполнения анкеты вход в систему не требуется.
            </Text>
            <Space.Compact style={{ width: '100%' }}>
              <Input readOnly value={inviteUrl} />
              <Button icon={<CopyOutlined />} onClick={copyInviteUrl}>
                Копировать
              </Button>
            </Space.Compact>
          </>
        )}
      </Modal>
    </div>
  );
}
