import { Button, Checkbox, Col, Divider, Form, Row, Select, Typography } from 'antd';
import type { SectionData, SourceSubjectEntry } from '../types';

const { Paragraph, Text } = Typography;

const QUESTION = 'Из каких источников вы получаете персональные данные в рамках процесса?';

export const PD_SOURCE_TYPES = [
  { value: 'individuals', label: 'Физические лица' },
  { value: 'legal_entities', label: 'Юридические лица' },
  { value: 'state', label: 'Государственные и муниципальные органы' },
  { value: 'public', label: 'Общедоступные источники' },
];

export const COLLECTION_METHODS_LEFT = [
  { value: 'website', label: 'Через сайт' },
  { value: 'mobile_app', label: 'Через мобильное приложение' },
  { value: 'api', label: 'По API' },
  { value: 'email', label: 'По Email' },
  { value: 'messengers', label: 'Интернет-мессенджеры' },
];

export const COLLECTION_METHODS_RIGHT = [
  { value: 'phone', label: 'По телефону' },
  { value: 'paper', label: 'На бумажных носителях' },
  { value: 'in_person', label: 'Очное общение с физическим лицом' },
  { value: 'other', label: 'Другой способ' },
];

export const ALL_COLLECTION_METHODS = [...COLLECTION_METHODS_LEFT, ...COLLECTION_METHODS_RIGHT];

const DEFAULT_PERSONAL_DATA = [
  'фамилия, имя, отчество',
  'номер телефона',
  'адрес электронной почты',
  'адрес доставки',
  'номер заказа',
  'вид оплаты',
];

function normalizeSourceSubjects(data: SectionData | undefined): SourceSubjectEntry[] {
  if (Array.isArray(data?.sourceSubjects) && data.sourceSubjects.length > 0) {
    return data.sourceSubjects.map(row => ({
      subject: String(row.subject || ''),
      personalData: Array.isArray(row.personalData) ? row.personalData.map(String) : [],
    }));
  }
  return [];
}

function normalizeCollectionMethods(data: SectionData | undefined): string[] {
  if (Array.isArray(data?.collectionMethods) && data.collectionMethods.length > 0) {
    return data.collectionMethods.map(String);
  }
  const legacy = data?.sources;
  if (Array.isArray(legacy)) {
    const map: Record<string, string> = {
      'От субъекта': 'in_person',
      'Из ИС': 'api',
      'Через сайт': 'website',
    };
    return legacy.map(s => map[s] || s).filter(Boolean);
  }
  return [];
}

export interface ProcessSection4FieldsProps {
  data: SectionData | undefined;
  onChange: (patch: Partial<SectionData>) => void;
  subjectSuggestions?: string[];
  personalDataSuggestions?: string[];
}

export default function ProcessSection4Fields({
  data,
  onChange,
  subjectSuggestions = [],
  personalDataSuggestions = [],
}: ProcessSection4FieldsProps) {
  const sourceType = data?.pdSourceType || 'individuals';
  const subjects = normalizeSourceSubjects(data);
  const collectionMethods = normalizeCollectionMethods(data);

  const subjectNames = subjects.map(s => s.subject);

  const patchSubjects = (entries: SourceSubjectEntry[]) => {
    onChange({ sourceSubjects: entries });
  };

  const onSubjectsChange = (names: string[]) => {
    const next = names.map(name => {
      const existing = subjects.find(s => s.subject === name);
      return existing || { subject: name, personalData: [] };
    });
    patchSubjects(next);
  };

  const updateSubjectData = (subject: string, personalData: string[]) => {
    patchSubjects(
      subjects.map(s => (s.subject === subject ? { ...s, personalData } : s)),
    );
  };

  const pdSuggestions = Array.from(
    new Set([...DEFAULT_PERSONAL_DATA, ...personalDataSuggestions, ...subjects.flatMap(s => s.personalData)]),
  ).map(v => ({ value: v, label: v }));

  const subjectOptions = Array.from(new Set([...subjectSuggestions, ...subjectNames]))
    .filter(Boolean)
    .map(v => ({ value: v, label: v }));

  return (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {QUESTION}
      </Paragraph>

      <Form.Item label="Тип источника">
        <Select
          value={sourceType}
          onChange={v => onChange({ pdSourceType: v })}
          options={PD_SOURCE_TYPES}
          style={{ maxWidth: 420 }}
        />
      </Form.Item>

      {sourceType === 'individuals' && (
        <>
          <Divider style={{ margin: '8px 0 16px' }} />
          <Text strong style={{ display: 'block', marginBottom: 12, letterSpacing: '0.02em' }}>
            ФИЗИЧЕСКИЕ ЛИЦА
          </Text>

          <Form.Item label="Выберите субъектов, которые передают вам данные">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Например: Клиенты"
              value={subjectNames}
              onChange={onSubjectsChange}
              options={subjectOptions}
              tokenSeparators={[',', ';']}
              showSearch
            />
          </Form.Item>

          {subjects.map(entry => (
            <div
              key={entry.subject}
              style={{
                marginBottom: 20,
                padding: '12px 14px',
                background: '#fafafa',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text strong>{entry.subject}</Text>
                <Button
                  type="link"
                  size="small"
                  onClick={() => updateSubjectData(entry.subject, [])}
                  disabled={entry.personalData.length === 0}
                >
                  Очистить поле
                </Button>
              </div>
              <Form.Item
                label="Персональные данные, передающиеся по данному субъекту"
                style={{ marginBottom: 0 }}
              >
                <Select
                  mode="tags"
                  style={{ width: '100%' }}
                  value={entry.personalData}
                  onChange={tags => updateSubjectData(entry.subject, tags)}
                  options={pdSuggestions}
                  tokenSeparators={[',', ';']}
                  placeholder="Выберите или введите перечень данных"
                />
              </Form.Item>
            </div>
          ))}

          <Form.Item
            label="Укажите способы получения персональных данных из отмеченных выше источников"
            style={{ marginTop: 8 }}
          >
            <Checkbox.Group
              value={collectionMethods}
              onChange={vals => onChange({ collectionMethods: vals as string[] })}
              style={{ width: '100%' }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {COLLECTION_METHODS_LEFT.map(opt => (
                      <Checkbox key={opt.value} value={opt.value}>
                        {opt.label}
                      </Checkbox>
                    ))}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {COLLECTION_METHODS_RIGHT.map(opt => (
                      <Checkbox key={opt.value} value={opt.value}>
                        {opt.label}
                      </Checkbox>
                    ))}
                  </div>
                </Col>
              </Row>
            </Checkbox.Group>
          </Form.Item>
        </>
      )}

      {sourceType !== 'individuals' && (
        <Paragraph type="secondary">
          Укажите сведения об источнике в дополнительной информации (секция 9) или выберите тип
          «Физические лица» для заполнения формы по субъектам.
        </Paragraph>
      )}
    </>
  );
}
