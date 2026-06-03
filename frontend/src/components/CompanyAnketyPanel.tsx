import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { AnketaInviteModal, AnketaSendAllModal } from './AnketaInviteModals';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import {
  deleteCompanyAnketa,
  fetchAnketaOverview,
  updateAnketaLabel,
  verifyCompanyAnketa,
  type AnketaOverviewItem,
} from '../api/publicAnketa';
import type { Process } from '../types';
import AnketaFormFooter from './AnketaFormFooter';
import type { AnketaTemplateType } from '../constants/anketaTemplates';
import { ANKETA_TEMPLATES } from '../constants/anketaTemplates';
import {
  getAnketaStatusLabel,
  formatAnketaDate,
} from '../utils/anketaDisplay';
import AnketaSummaryView from './AnketaSummaryView';
import SitesAnketaFormFields, {
  companyToSitesAnketaValues,
  sitesAnketaValuesToCompanyPatch,
  type SitesAnketaValues,
} from '../components/SitesAnketaForm';
import DepartmentsAnketaFormFields, {
  companyToDepartmentsAnketaValues,
  departmentsAnketaValuesToCompanyPatch,
  type DepartmentsAnketaValues,
} from '../components/DepartmentsAnketaForm';
import type { Company, Responsible } from '../types';

const { Text } = Typography;

function getAnketaActionLabel(status: string): string {
  if (status === 'not_filled' || status === 'sent' || status === 'filling') return 'Заполнить';
  if (status === 'verified') return 'Изменить';
  return 'Проверить';
}

const ACTIVITIES = ['Строительство', 'IT', 'Финансы', 'Торговля'];

const RESP_CHECKBOXES: { key: keyof Responsible; label: string }[] = [
  { key: 'isSecurity', label: 'Также является ответственным за обеспечение безопасности ПДн в ИС' },
  { key: 'controlsCompliance', label: 'Осуществляет внутренний контроль за соблюдением оператором и его работниками законодательства РФ о ПДн' },
  { key: 'informsEmployees', label: 'Доводит до работников оператора положения законодательства РФ о ПДн' },
  { key: 'handlesRequests', label: 'Организован приём и обработка обращений и запросов субъектов ПДн' },
];

interface CompanyAnketyPanelProps {
  companyId: number;
}

export default function CompanyAnketyPanel({ companyId }: CompanyAnketyPanelProps) {
  const { state, dispatch } = useApp();
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [editRespOpen, setEditRespOpen] = useState(false);
  const [editSitesOpen, setEditSitesOpen] = useState(false);
  const [editDepartmentsOpen, setEditDepartmentsOpen] = useState(false);
  const [companyForm] = Form.useForm();
  const [respForm] = Form.useForm();
  const [sitesForm] = Form.useForm<SitesAnketaValues>();
  const [departmentsForm] = Form.useForm<DepartmentsAnketaValues>();
  const [anketaItems, setAnketaItems] = useState<AnketaOverviewItem[]>([]);
  const [editingAnketaType, setEditingAnketaType] = useState<AnketaTemplateType | null>(null);
  const [markVerified, setMarkVerified] = useState(false);
  const [renameTarget, setRenameTarget] = useState<AnketaOverviewItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [sendTemplate, setSendTemplate] = useState<AnketaOverviewItem | null>(null);
  const [sendAllOpen, setSendAllOpen] = useState(false);

  const company = state.companies.find(c => c.id === companyId);
  const resp = state.responsibles.find(r => r.companyId === companyId);

  const refreshAnketaOverview = useCallback(async () => {
    if (!company) return;
    try {
      const data = await fetchAnketaOverview(company.id);
      setAnketaItems(data.items);
    } catch {
      setAnketaItems([]);
    }
  }, [company]);

  useEffect(() => {
    refreshAnketaOverview();
  }, [refreshAnketaOverview]);

  const statusByType = useMemo(
    () => Object.fromEntries(anketaItems.map(i => [i.anketaType, i.rawStatus])),
    [anketaItems],
  );

  const openAnketaEditor = useCallback((anketaType: AnketaTemplateType) => {
    setEditingAnketaType(anketaType);
    setMarkVerified(statusByType[anketaType] === 'verified');
  }, [statusByType]);

  const closeAnketaEditor = useCallback(() => {
    setEditCompanyOpen(false);
    setEditRespOpen(false);
    setEditSitesOpen(false);
    setEditDepartmentsOpen(false);
    setEditingAnketaType(null);
    setMarkVerified(false);
  }, []);

  const applyVerifiedIfNeeded = useCallback(async () => {
    if (!markVerified || !editingAnketaType || !company) return;
    try {
      await verifyCompanyAnketa(company.id, editingAnketaType);
      const { data: processes } = await api.get<Process[]>('/processes', { params: { companyId: company.id } });
      dispatch({ type: 'HYDRATE', data: { processes } });
    } catch {
      message.error('Не удалось отметить анкету как проверенную');
      throw new Error('verify failed');
    }
  }, [markVerified, editingAnketaType, company, dispatch]);

  const openRename = (item: AnketaOverviewItem) => {
    setRenameTarget(item);
    setRenameValue(item.name);
  };

  const saveRename = async () => {
    if (!company || !renameTarget) return;
    const name = renameValue.trim();
    if (!name) {
      message.warning('Введите название');
      return;
    }
    setRenaming(true);
    try {
      const updated = await updateAnketaLabel(company.id, renameTarget.anketaType, name);
      dispatch({ type: 'UPDATE_COMPANY', id: company.id, data: updated });
      await refreshAnketaOverview();
      setRenameTarget(null);
      message.success('Название сохранено');
    } catch {
      message.error('Не удалось сохранить название');
    } finally {
      setRenaming(false);
    }
  };

  const mainRows = useMemo(() => {
    const items = anketaItems.length
      ? anketaItems
      : ANKETA_TEMPLATES.map(t => ({
          anketaType: t.anketaType,
          name: t.name,
          rawStatus: 'not_filled',
          displayStatus: 'not_filled' as const,
          createdAt: null,
          updatedAt: null,
        }));
    return items.map((item, index) => ({
      ...item,
      key: item.anketaType,
      num: index + 1,
      openForm: () => {
      if (!company) return;
      openAnketaEditor(item.anketaType as AnketaTemplateType);
      if (item.anketaType === 'company') {
        companyForm.setFieldsValue({
          ...company,
          pdStartDate: company.pdStartDate ? dayjs(company.pdStartDate) : null,
        });
        setEditCompanyOpen(true);
      } else if (item.anketaType === 'responsible') {
        respForm.setFieldsValue(resp ?? {
          id: 0,
          companyId: company.id,
          role: 'organizer',
          fio: '',
          position: '',
          email: '',
          phone: '',
          isSecurity: false,
          controlsCompliance: false,
          informsEmployees: false,
          handlesRequests: false,
        });
        setEditRespOpen(true);
      } else if (item.anketaType === 'sites') {
        sitesForm.setFieldsValue(companyToSitesAnketaValues(company));
        setEditSitesOpen(true);
      } else if (item.anketaType === 'departments') {
        departmentsForm.setFieldsValue(companyToDepartmentsAnketaValues(company));
        setEditDepartmentsOpen(true);
      }
      },
    }));
  }, [anketaItems, company, resp, companyForm, respForm, sitesForm, departmentsForm, openAnketaEditor]);

  const mainColumns = [
    { title: '№', dataIndex: 'num', key: 'num', width: 56 },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, row: (typeof mainRows)[0]) => (
        <span
          style={{ fontWeight: 550, color: '#1677ff', cursor: 'pointer' }}
          onClick={() => openRename(row)}
          title="Изменить название"
        >
          {v}
        </span>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'rawStatus',
      key: 'status',
      width: 280,
      render: (rawStatus: string) => (
        <Text>{getAnketaStatusLabel(rawStatus)}</Text>
      ),
    },
    {
      title: 'Дата загрузки',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (v: string | null) => <Text type="secondary">{formatAnketaDate(v)}</Text>,
    },
    {
      title: 'Дата обновления',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: (v: string | null) => <Text type="secondary">{formatAnketaDate(v)}</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 260,
      render: (_: unknown, row: (typeof mainRows)[0]) => (
        <Space size={4} onClick={e => e.stopPropagation()} wrap>
          <Button type="link" size="small" onClick={row.openForm}>
            {getAnketaActionLabel(row.rawStatus)}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SendOutlined />}
            onClick={() => setSendTemplate(row)}
          >
            Отправить
          </Button>
          <Popconfirm
            title="Удалить данные этой анкеты?"
            description="Поля анкеты, приглашения и связанные процессы будут сброшены."
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteAnketa(row.anketaType)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} title="Удалить" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const saveCompany = async (values: Company & { pdStartDate?: dayjs.Dayjs }) => {
    if (!company) return;
    try {
      await dispatch({
        type: 'UPDATE_COMPANY',
        id: company.id,
        data: {
          ...values,
          pdStartDate: values.pdStartDate
            ? (values.pdStartDate as dayjs.Dayjs).format('YYYY-MM-DD')
            : company.pdStartDate,
        },
      });
      await applyVerifiedIfNeeded();
      message.success('Данные компании сохранены');
      closeAnketaEditor();
      await refreshAnketaOverview();
    } catch {
      message.error('Не удалось сохранить данные');
    }
  };

  const saveResponsible = async (values: Responsible) => {
    try {
      await dispatch({ type: 'UPDATE_RESPONSIBLE', id: values.id, data: values });
      await applyVerifiedIfNeeded();
      message.success('Данные ответственного сохранены');
      closeAnketaEditor();
      await refreshAnketaOverview();
    } catch {
      message.error('Не удалось сохранить данные');
    }
  };

  const saveSites = async (values: SitesAnketaValues) => {
    if (!company) return;
    try {
      await dispatch({ type: 'UPDATE_COMPANY', id: company.id, data: sitesAnketaValuesToCompanyPatch(values) });
      await applyVerifiedIfNeeded();
      message.success('Данные сохранены');
      closeAnketaEditor();
      await refreshAnketaOverview();
    } catch {
      message.error('Не удалось сохранить данные');
    }
  };

  const saveDepartments = async (values: DepartmentsAnketaValues) => {
    if (!company) return;
    try {
      await dispatch({ type: 'UPDATE_COMPANY', id: company.id, data: departmentsAnketaValuesToCompanyPatch(values) });
      await applyVerifiedIfNeeded();
      message.success('Данные сохранены');
      closeAnketaEditor();
      await refreshAnketaOverview();
    } catch {
      message.error('Не удалось сохранить данные');
    }
  };

  const handleDeleteAnketa = async (anketaType: AnketaTemplateType) => {
    if (!company) return;
    try {
      const { company: updated, responsible, items } = await deleteCompanyAnketa(
        company.id,
        anketaType,
      );
      await dispatch({ type: 'UPDATE_COMPANY', id: updated.id, data: updated });
      const nextResponsibles = responsible
        ? state.responsibles.some(r => r.id === responsible.id)
          ? state.responsibles.map(r => (r.id === responsible.id ? responsible : r))
          : [...state.responsibles, responsible]
        : state.responsibles.filter(r => r.companyId !== company.id);
      dispatch({ type: 'HYDRATE', data: { responsibles: nextResponsibles } });
      const { data: processes } = await api.get<Process[]>('/processes', { params: { companyId: company.id } });
      dispatch({ type: 'HYDRATE', data: { processes } });
      setAnketaItems(items);
      closeAnketaEditor();
      message.success('Данные анкеты удалены');
    } catch {
      message.error('Не удалось удалить анкету');
    }
  };

  const editingStatus = editingAnketaType ? (statusByType[editingAnketaType] || 'not_filled') : 'not_filled';
  const anketaFooter = (
    <AnketaFormFooter
      markVerified={markVerified}
      onMarkVerifiedChange={setMarkVerified}
      onClose={closeAnketaEditor}
      verifyDisabled={editingStatus === 'verified'}
    />
  );

  if (!company) return null;

  return (
    <>
      <Card
        title="Анкеты компании"
        extra={
          <Button type="primary" icon={<SendOutlined />} onClick={() => setSendAllOpen(true)}>
            Отправить все анкеты
          </Button>
        }
      >
        <Table
          rowKey="key"
          dataSource={mainRows}
          columns={mainColumns}
          pagination={false}
          size="middle"
          expandable={{
            expandedRowRender: row => company ? (
              <AnketaSummaryView anketaType={row.anketaType} company={company} responsible={resp} />
            ) : null,
            rowExpandable: row => ['filling', 'filled', 'need_check', 'verified'].includes(row.rawStatus),
          }}
        />
      </Card>

      <Modal title="Анкета информации о компании" open={editCompanyOpen} onCancel={closeAnketaEditor} footer={null} width={800} destroyOnClose>
        <Form form={companyForm} layout="vertical" onFinish={saveCompany}>
          <Text strong style={{ color: '#1677ff', display: 'block', marginBottom: 14 }}>1. Основная информация</Text>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="inn" label="ИНН (10 цифр)"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="ogrn" label="ОГРН"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="okved" label="ОКВЭД"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="name" label="Полное наименование"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="shortName" label="Сокращённое наименование"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="activity" label="Вид деятельности"><Select options={ACTIVITIES.map(a => ({ value: a, label: a }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="pdStartDate" label="Дата начала обработки ПДн"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="isOperator" valuePropName="checked"><Checkbox>Организация числится в реестре операторов ПДн</Checkbox></Form.Item>
          <Form.Item name="hasCrossBorder" valuePropName="checked"><Checkbox>Организация подала уведомление о трансграничной передаче ПДн</Checkbox></Form.Item>
          <Text strong style={{ color: '#1677ff', display: 'block', margin: '20px 0 14px' }}>2. Контактная информация</Text>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="phone" label="Контактный телефон *"><Input placeholder="+7 (999) 999-99-99" /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Контактный Email *"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="ceoPosition" label="Должность руководителя *"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="ceo" label="ФИО руководителя *"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="city" label="Населённый пункт *"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="contactEmail" label="Email контактного лица"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="legalAddress" label="Юридический адрес *"><Input /></Form.Item>
          <Form.Item name="postalAddress" label="Почтовый адрес *"><Input placeholder="Совпадает с юридическим" /></Form.Item>
          {anketaFooter}
        </Form>
      </Modal>

      <Modal title="Ответственные за обработку и защиту ПДн" open={editRespOpen} onCancel={closeAnketaEditor} footer={null} width={720} destroyOnClose>
        <Form form={respForm} layout="vertical" onFinish={saveResponsible}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="companyId" hidden><Input /></Form.Item>
          <Form.Item name="role" hidden><Input /></Form.Item>
          <Text strong style={{ color: '#1677ff', display: 'block', marginBottom: 14 }}>1. Ответственный за организацию обработки ПДн</Text>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="fio" label="ФИО ответственного"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="position" label="Должность"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="email" label="Контактный Email"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="Контактный телефон"><Input /></Form.Item></Col>
          </Row>
          {RESP_CHECKBOXES.map(({ key, label }) => (
            <Form.Item key={key} name={key} valuePropName="checked"><Checkbox>{label}</Checkbox></Form.Item>
          ))}
          {anketaFooter}
        </Form>
      </Modal>

      <Modal title="Сайты и мобильные приложения компании" open={editSitesOpen} onCancel={closeAnketaEditor} footer={null} width={760} destroyOnClose>
        <Form form={sitesForm} layout="vertical" onFinish={saveSites} initialValues={{ sites: [], apps: [], hasDirectories: false, contactEmail: '' }}>
          <SitesAnketaFormFields />
          {anketaFooter}
        </Form>
      </Modal>

      <AnketaInviteModal
        open={!!sendTemplate}
        template={sendTemplate ? { anketaType: sendTemplate.anketaType, name: sendTemplate.name } : null}
        fixedCompanyId={companyId}
        onClose={() => {
          setSendTemplate(null);
          refreshAnketaOverview();
        }}
      />
      <AnketaSendAllModal
        open={sendAllOpen}
        fixedCompanyId={companyId}
        onClose={() => {
          setSendAllOpen(false);
          refreshAnketaOverview();
        }}
      />

      <Modal
        title="Название анкеты"
        open={!!renameTarget}
        onCancel={() => setRenameTarget(null)}
        onOk={saveRename}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={renaming}
        destroyOnClose
      >
        <Input
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onPressEnter={saveRename}
          placeholder="Введите название"
          maxLength={200}
        />
      </Modal>

      <Modal title="Отделы и должности, работающие с персональными данными" open={editDepartmentsOpen} onCancel={closeAnketaEditor} footer={null} width={760} destroyOnClose>
        <Form form={departmentsForm} layout="vertical" onFinish={saveDepartments} initialValues={{ departmentsInfo: '', contactEmail: '' }}>
          <DepartmentsAnketaFormFields />
          {anketaFooter}
        </Form>
      </Modal>
    </>
  );
}
