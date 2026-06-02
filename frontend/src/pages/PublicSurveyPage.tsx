import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Form,
  Layout,
  Result,
  Space,
  Spin,
  Tabs,
  Typography,
  message,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { SECTION_NAMES } from '../constants';
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
import {
  fetchPublicSurvey,
  savePublicSection,
  submitPublicSurvey,
} from '../api/publicSurvey';
import type { SectionData } from '../types';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

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
    const s3 = sections[3]?.data;
    const s4 = sections[4]?.data;
    const s5 = sections[5]?.data;
    const s6 = sections[6]?.data;
    const s7 = sections[7]?.data;
    const s8 = sections[8]?.data;
    const s9 = sections[9]?.data;
    const personGroupSuggestions = Array.isArray(s2?.personGroups)
      ? s2.personGroups.map(String)
      : typeof s2?.persons === 'string' && s2.persons
        ? s2.persons.split(/[,;]/).map(s => s.trim()).filter(Boolean)
        : [];
    const sourceSubjectSuggestions = Array.isArray(s4?.sourceSubjects)
      ? s4.sourceSubjects.map(s => String(s.subject || '')).filter(Boolean)
      : [];
    const subjectSuggestionsFor5 = Array.from(new Set([...personGroupSuggestions, ...sourceSubjectSuggestions]));
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
          Процессы по ПДн — ГК «Самолёт»
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
