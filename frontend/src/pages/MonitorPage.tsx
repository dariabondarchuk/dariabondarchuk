import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { CheckOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { EVENT_TYPES } from '../constants';
import { runDadataEgrulCheck } from '../utils/dadataMonitor';
import type { MonitorEvent } from '../types';

const { Title, Paragraph } = Typography;

const eventTagColor: Record<string, string> = {
  name_change: 'purple',
  ceo_change: 'red',
  address_change: 'gold',
  okved_change: 'blue',
  ogrn_change: 'cyan',
  contact_change: 'geekblue',
};

export default function MonitorPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingEgrul, setCheckingEgrul] = useState(false);
  const [form] = Form.useForm();
  const unread = state.monitorEvents.filter(e => !e.read).length;

  const checkEgrul = async (silent = false) => {
    setCheckingEgrul(true);
    try {
      await runDadataEgrulCheck(dispatch, { silent });
    } catch {
      message.error('Не удалось проверить изменения в ЕГРЮЛ через DaData');
    } finally {
      setCheckingEgrul(false);
    }
  };

  useEffect(() => {
    if (state.companies.length) {
      void checkEgrul(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const events = state.monitorEvents.filter(e => {
    const comp = state.companies.find(c => c.id === e.companyId);
    const typeLabel = EVENT_TYPES[e.type] ?? '';
    return (
      comp?.name.toLowerCase().includes(search.toLowerCase()) ||
      typeLabel.toLowerCase().includes(search.toLowerCase())
    );
  });

  const openAdd = () => {
    form.setFieldsValue({
      companyId: state.companies[0]?.id,
      eventDate: dayjs(),
      eventType: 'ceo_change',
      oldValue: '',
      newValue: '',
    });
    setAddModal(true);
  };

  const handleAdd = async (values: {
    companyId: number;
    eventDate: dayjs.Dayjs;
    eventType: string;
    oldValue?: string;
    newValue?: string;
  }) => {
    setSubmitting(true);
    try {
      await dispatch({
        type: 'ADD_MONITOR',
        data: {
          companyId: values.companyId,
          eventDate: values.eventDate?.format('YYYY-MM-DD'),
          eventType: values.eventType,
          oldValue: values.oldValue,
          newValue: values.newValue,
        },
      });
      message.success('Уведомление добавлено');
      setAddModal(false);
      form.resetFields();
    } catch {
      message.error('Не удалось добавить уведомление');
    } finally {
      setSubmitting(false);
    }
  };

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
      <Title level={3} style={{ marginTop: 0 }}>Уведомления</Title>
      <Paragraph type="secondary" style={{ marginTop: -8, marginBottom: 14 }}>
        Изменения в ЕГРЮЛ по компаниям из реестра подтягиваются из DaData при входе и по кнопке проверки.
      </Paragraph>
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
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Input.Search placeholder="Поиск..." allowClear value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
          <Space>
            <Button
              icon={<SyncOutlined />}
              loading={checkingEgrul}
              onClick={() => checkEgrul(false)}
            >
              Проверить ЕГРЮЛ
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Добавить
            </Button>
          </Space>
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

      <Modal
        title="Новое уведомление"
        open={addModal}
        onCancel={() => setAddModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="eventDate" label="Дата" rules={[{ required: true, message: 'Укажите дату' }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="companyId" label="Компания" rules={[{ required: true, message: 'Выберите компанию' }]}>
            <Select options={state.companies.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="eventType" label="Тип изменения" rules={[{ required: true, message: 'Выберите тип' }]}>
            <Select options={Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="oldValue" label="Было">
            <Input placeholder="Предыдущее значение" />
          </Form.Item>
          <Form.Item name="newValue" label="Стало">
            <Input placeholder="Новое значение" />
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setAddModal(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Сохранить
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
