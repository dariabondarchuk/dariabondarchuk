import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Layout,
  Result,
  Row,
  Select,
  Spin,
  Typography,
  message,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  fetchPublicAnketa,
  lookupPublicAnketaParty,
  savePublicAnketa,
  submitPublicAnketa,
} from '../api/publicAnketa';
import DadataLookup from '../components/DadataLookup';
import { dadataToAnketaFormValues } from '../utils/dadataAnketa';
import SitesAnketaFormFields, {
  normalizeSitesAnketaData,
  sitesAnketaValuesToPayload,
} from '../components/SitesAnketaForm';
import DepartmentsAnketaFormFields, {
  departmentsAnketaValuesToPayload,
  normalizeDepartmentsAnketaData,
} from '../components/DepartmentsAnketaForm';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const ACTIVITIES = ['Строительство', 'IT', 'Финансы', 'Торговля'];

export default function PublicAnketaPage() {
  const { token } = useParams<{ token: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    anketaType: string;
    anketaName: string;
    companyName: string;
    comment?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPublicAnketa(token)
      .then(data => {
        setMeta({
          anketaType: data.anketaType,
          anketaName: data.anketaName,
          companyName: data.companyName,
          comment: data.comment,
        });
        const values = { ...(data.data || {}) };
        if (values.pdStartDate) {
          values.pdStartDate = dayjs(values.pdStartDate as string);
        }
        if (data.anketaType === 'sites') {
          form.setFieldsValue(normalizeSitesAnketaData(values as Record<string, unknown>));
        } else if (data.anketaType === 'departments') {
          form.setFieldsValue(normalizeDepartmentsAnketaData(values as Record<string, unknown>));
        } else {
          form.setFieldsValue(values);
        }
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        if (msg === 'SUBMITTED') setSubmitted(true);
        else setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token, form]);

  const buildPayload = (values: Record<string, unknown>) => {
    if (meta?.anketaType === 'sites') {
      return sitesAnketaValuesToPayload(values as Parameters<typeof sitesAnketaValuesToPayload>[0]);
    }
    if (meta?.anketaType === 'departments') {
      return departmentsAnketaValuesToPayload(values as Parameters<typeof departmentsAnketaValuesToPayload>[0]);
    }
    return {
      ...values,
      pdStartDate: values.pdStartDate
        ? (values.pdStartDate as dayjs.Dayjs).format('YYYY-MM-DD')
        : undefined,
    };
  };

  const handleSubmit = async () => {
    if (!token) return;
    const values = await form.validateFields();
    const data = buildPayload(values);
    setSubmitting(true);
    try {
      await submitPublicAnketa(token, data);
      setSubmitted(true);
    } catch {
      message.error('Не удалось отправить анкету');
    } finally {
      setSubmitting(false);
    }
  };

  const applyDadata = (data: Parameters<typeof dadataToAnketaFormValues>[1]) => {
    if (!meta) return;
    const patch = dadataToAnketaFormValues(meta.anketaType, data);
    const current = form.getFieldsValue();
    form.setFieldsValue({ ...current, ...patch });
    message.success('Данные организации подставлены из DaData — проверьте и сохраните');
  };

  const handleSave = async () => {
    if (!token) return;
    const values = form.getFieldsValue();
    const data = buildPayload(values);
    try {
      await savePublicAnketa(token, data);
      message.success('Черновик сохранён');
    } catch {
      message.error('Не удалось сохранить');
    }
  };

  const renderForm = () => {
    if (!meta) return null;
    const type = meta.anketaType;

    if (type === 'company') {
      return (
        <>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="inn" label="ИНН"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="ogrn" label="ОГРН"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="okved" label="ОКВЭД"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="name" label="Полное наименование"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="shortName" label="Сокращённое наименование"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="activity" label="Вид деятельности">
                <Select options={ACTIVITIES.map(a => ({ value: a, label: a }))} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="pdStartDate" label="Дата начала обработки ПДн">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="phone" label="Телефон"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="ceo" label="ФИО руководителя"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="ceoPosition" label="Должность"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="legalAddress" label="Юридический адрес"><Input /></Form.Item>
        </>
      );
    }

    if (type === 'responsible') {
      return (
        <>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="fio" label="ФИО" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="position" label="Должность"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="Телефон"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="isSecurity" valuePropName="checked"><Checkbox>Ответственный за безопасность ПДн в ИС</Checkbox></Form.Item>
          <Form.Item name="controlsCompliance" valuePropName="checked"><Checkbox>Контроль соблюдения законодательства о ПДн</Checkbox></Form.Item>
          <Form.Item name="informsEmployees" valuePropName="checked"><Checkbox>Информирует работников о требованиях закона</Checkbox></Form.Item>
          <Form.Item name="handlesRequests" valuePropName="checked"><Checkbox>Обрабатывает обращения субъектов ПДн</Checkbox></Form.Item>
        </>
      );
    }

    if (type === 'sites') {
      return <SitesAnketaFormFields />;
    }

    if (type === 'departments') {
      return <DepartmentsAnketaFormFields />;
    }

    return null;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Загрузка анкеты..." />
      </div>
    );
  }

  if (submitted) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#F5F6FA' }}>
        <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="Анкета отправлена"
            subTitle="Данные переданы DPO на проверку. Ссылка больше недоступна для редактирования."
          />
        </Content>
      </Layout>
    );
  }

  if (error || !meta) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#F5F6FA' }}>
        <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Result status="error" title="Ссылка недоступна" subTitle={error || 'Не найдено'} />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#F5F6FA' }}>
      <Header style={{ background: '#002E8C', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56 }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>Процессы по ПДн — ГК «Самолёт»</Title>
      </Header>
      <Content style={{ padding: '24px 24px 48px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <Title level={3} style={{ marginTop: 0 }}>{meta.anketaName}</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{meta.companyName}</Text>
        {meta.comment && (
          <Alert type="info" message="Комментарий от DPO" description={meta.comment} style={{ marginBottom: 16 }} showIcon />
        )}
        <Card>
          {token && (
            <DadataLookup
              buttonText="Найти в ЕГРЮЛ"
              hint="Введите ИНН, ОГРН или название организации — подставятся реквизиты в анкету"
              lookup={q => lookupPublicAnketaParty(token, q)}
              onLoaded={applyDadata}
            />
          )}
          <Form form={form} layout="vertical">{renderForm()}</Form>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
            <Button onClick={handleSave}>Сохранить черновик</Button>
            <Button type="primary" onClick={handleSubmit} loading={submitting}>
              Отправить на проверку
            </Button>
          </div>
        </Card>
      </Content>
    </Layout>
  );
}
