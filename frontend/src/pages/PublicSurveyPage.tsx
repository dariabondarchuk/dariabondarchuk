import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Layout,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Typography,
  message,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { SECTION_NAMES } from '../constants';
import { StatusBadge } from '../components/StatusBadge';
import {
  fetchPublicSurvey,
  savePublicSection,
  submitPublicSurvey,
} from '../api/publicSurvey';
import type { SectionData } from '../types';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

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

export default function PublicSurveyPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [processName, setProcessName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [comment, setComment] = useState<string | undefined>();
  const [sections, setSections] = useState<Record<number, { status: string; data: SectionData }>>({});
  const [activeSection, setActiveSection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchPublicSurvey(token)
      .then(data => {
        setProcessName(data.processName);
        setCompanyName(data.companyName);
        setComment(data.comment);
        setSections(data.sections);
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        if (msg === 'SUBMITTED') setSubmitted(true);
        else setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const updateSection = useCallback((section: number, data: SectionData) => {
    setSections(prev => ({
      ...prev,
      [section]: {
        status: 'filling',
        data: { ...(prev[section]?.data || {}), ...data },
      },
    }));
  }, []);

  const handleSaveSection = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const data = sections[activeSection]?.data || {};
      await savePublicSection(token, activeSection, data);
      message.success('Секция сохранена');
    } catch {
      message.error('Не удалось сохранить секцию');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(sections).map(([n, s]) => [n, { data: s.data }]),
      );
      await submitPublicSurvey(token, payload);
      setSubmitted(true);
    } catch {
      message.error('Не удалось отправить анкету');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSectionForm = () => {
    const s1 = sections[1]?.data;
    const s2 = sections[2]?.data;
    const s5 = sections[5]?.data;

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
                  pdCategories: e.target.value.split(',').map(x => x.trim()).filter(Boolean),
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
        Заполните доступные поля или укажите информацию в комментарии к процессу.
        Секция «{SECTION_NAMES[activeSection]}» будет уточнена DPO при проверке.
      </Text>
    );
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
            subTitle="Спасибо! Данные переданы на проверку DPO. Ссылка больше недоступна для редактирования."
          />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#F5F6FA' }}>
        <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Result status="error" title="Ссылка недоступна" subTitle={error} />
        </Content>
      </Layout>
    );
  }

  const sectionTabItems = Object.entries(SECTION_NAMES).map(([n, name]) => ({
    key: n,
    label: (
      <Space size={4}>
        <span>{n}. {name.split(' ')[0]}</span>
        <StatusBadge status={sections[+n]?.status || 'not_filled'} />
      </Space>
    ),
  }));

  return (
    <Layout style={{ minHeight: '100vh', background: '#F5F6FA' }}>
      <Header
        style={{
          background: '#002E8C',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          height: 56,
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          Реестр ПДн — ГК «Самолёт»
        </Title>
      </Header>
      <Content style={{ padding: '24px 24px 48px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <Title level={3} style={{ marginTop: 0 }}>
          Анкета процесса обработки ПДн
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {companyName} · {processName}
        </Text>
        {comment && (
          <Alert type="info" message="Комментарий от DPO" description={comment} style={{ marginBottom: 16 }} showIcon />
        )}

        <Card>
          <Tabs
            activeKey={String(activeSection)}
            onChange={k => setActiveSection(Number(k))}
            items={sectionTabItems}
            style={{ marginBottom: 16 }}
          />
          <Form layout="vertical">{renderSectionForm()}</Form>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
            <Button onClick={handleSaveSection} loading={saving}>
              Сохранить секцию
            </Button>
            <Button type="primary" onClick={handleSubmit} loading={submitting}>
              Отправить анкету на проверку
            </Button>
          </div>
        </Card>
      </Content>
    </Layout>
  );
}
