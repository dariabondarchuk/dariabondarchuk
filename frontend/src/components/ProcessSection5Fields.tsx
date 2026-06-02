import { useState } from 'react';
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  Radio,
  Upload,
} from 'antd';
import { LinkOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { ProcessedDataSubjectEntry, SectionData } from '../types';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

const DEFAULT_PERSONAL_DATA = [
  'фамилия, имя, отчество',
  'номер телефона',
  'адрес электронной почты',
  'адрес доставки',
  'номер заказа',
  'вид оплаты',
];

export const PD_ACTION_GROUPS: { title?: string; items: { key: string; label: string }[] }[] = [
  {
    items: [
      { key: 'collection', label: 'Сбор' },
      { key: 'systematization', label: 'Систематизация' },
      { key: 'storage', label: 'Хранение' },
      { key: 'use', label: 'Использование' },
      { key: 'extraction', label: 'Извлечение' },
      { key: 'depersonalization', label: 'Обезличивание' },
      { key: 'blocking', label: 'Блокирование' },
      { key: 'destruction', label: 'Уничтожение' },
      { key: 'blocking_6months', label: 'Производится ли блокирование на 6 месяцев?' },
      { key: 'recording', label: 'Запись' },
      { key: 'deletion', label: 'Удаление' },
      { key: 'accumulation', label: 'Накопление' },
      { key: 'localization', label: 'Соблюдаются ли требования о локализации?' },
      { key: 'destruction_act', label: 'Фиксируется ли факт уничтожения актом?' },
    ],
  },
  {
    title: 'Передача',
    items: [
      { key: 'distribution', label: 'Распространение' },
      { key: 'provision', label: 'Предоставление' },
      { key: 'access', label: 'Доступ' },
    ],
  },
  {
    title: 'Уточнение',
    items: [
      { key: 'update', label: 'Обновление' },
      { key: 'change', label: 'Изменение' },
    ],
  },
];

export const ALL_PD_ACTION_KEYS = PD_ACTION_GROUPS.flatMap(g => g.items.map(i => i.key));

export const LEGAL_BASIS_OPTIONS = [
  { value: 'consent', label: 'Согласие на обработку персональных данных', hasDocs: true },
  { value: 'contract', label: 'Договор / оферта / соглашение', hasDocs: true },
  { value: 'legislation', label: 'Требования законодательства Российской Федерации' },
  { value: 'contract_initiative', label: 'Инициатива физического лица по заключению договора' },
  {
    value: 'legitimate_interests',
    label: 'Осуществление прав и законных интересов вашей организации или третьих лиц',
  },
  { value: 'other', label: 'Другие основания' },
];

const LEGACY_LEGAL_MAP: Record<string, string> = {
  'Согласие субъекта': 'consent',
  Договор: 'contract',
  'Трудовой договор': 'contract',
  Закон: 'legislation',
  'Жизненно важные интересы': 'legitimate_interests',
};

function normalizeProcessedSubjects(data: SectionData | undefined): ProcessedDataSubjectEntry[] {
  if (Array.isArray(data?.processedDataSubjects) && data.processedDataSubjects.length > 0) {
    return data.processedDataSubjects.map(row => ({
      subject: String(row.subject || ''),
      personalData: Array.isArray(row.personalData) ? row.personalData.map(String) : [],
    }));
  }
  if (Array.isArray(data?.pdCategories) && data.pdCategories.length > 0) {
    return [{ subject: 'Клиенты', personalData: data.pdCategories.map(String) }];
  }
  return [];
}

function normalizePdActions(data: SectionData | undefined): string[] {
  if (Array.isArray(data?.pdActions) && data.pdActions.length > 0) {
    return data.pdActions.map(String);
  }
  if (Array.isArray(data?.actions)) {
    return data.actions.map(String);
  }
  return [];
}

function normalizeLegalBases(data: SectionData | undefined): string[] {
  if (Array.isArray(data?.legalBases) && data.legalBases.length > 0) {
    return data.legalBases.map(String);
  }
  if (data?.legalBasis && typeof data.legalBasis === 'string') {
    const mapped = LEGACY_LEGAL_MAP[data.legalBasis];
    return mapped ? [mapped] : [];
  }
  if (data?.consentRequired) return ['consent'];
  return [];
}

function normalizeBasisLinks(data: SectionData | undefined): Record<string, string[]> {
  const raw = data?.legalBasisLinks;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(raw)) {
      out[k] = Array.isArray(v) ? v.map(String) : [];
    }
    return out;
  }
  return {};
}

function normalizeBasisFiles(data: SectionData | undefined): Record<string, string[]> {
  const raw = data?.legalBasisFiles;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(raw)) {
      out[k] = Array.isArray(v) ? v.map(String) : [];
    }
    return out;
  }
  return {};
}

function syncPdCategories(subjects: ProcessedDataSubjectEntry[]): string[] {
  return Array.from(new Set(subjects.flatMap(s => s.personalData).filter(Boolean)));
}

interface LegalBasisDocsProps {
  basisKey: string;
  links: string[];
  files: string[];
  onLinksChange: (links: string[]) => void;
  onFilesChange: (files: string[]) => void;
}

function LegalBasisDocs({ basisKey, links, files, onLinksChange, onFilesChange }: LegalBasisDocsProps) {
  const [linkInput, setLinkInput] = useState('');

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    onLinksChange([...links, url]);
    setLinkInput('');
  };

  return (
    <div style={{ marginLeft: 24, marginBottom: 12 }}>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {links.map((link, i) => (
          <Input
            key={`${basisKey}-link-${i}`}
            value={link}
            onChange={e => {
              const next = [...links];
              next[i] = e.target.value;
              onLinksChange(next);
            }}
            addonAfter={
              <Button type="link" size="small" danger onClick={() => onLinksChange(links.filter((_, j) => j !== i))}>
                Удалить
              </Button>
            }
          />
        ))}
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="https://..."
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            onPressEnter={addLink}
          />
          <Button type="link" icon={<LinkOutlined />} onClick={addLink}>
            Добавить ссылку на документ
          </Button>
        </Space.Compact>
        <Upload
          multiple
          showUploadList
          beforeUpload={file => {
            onFilesChange([...files, file.name]);
            return false;
          }}
          onRemove={file => onFilesChange(files.filter(n => n !== file.name))}
          fileList={files.map((name, i) => ({ uid: `${basisKey}-${i}`, name, status: 'done' as const }))}
        >
          <Button icon={<UploadOutlined />} size="small">
            Загрузить документ
          </Button>
        </Upload>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Доступные форматы: pdf, txt, doc, docx, dot
        </Text>
      </Space>
    </div>
  );
}

export interface ProcessSection5FieldsProps {
  data: SectionData | undefined;
  onChange: (patch: Partial<SectionData>) => void;
  subjectSuggestions?: string[];
  personalDataSuggestions?: string[];
}

export default function ProcessSection5Fields({
  data,
  onChange,
  subjectSuggestions = [],
  personalDataSuggestions = [],
}: ProcessSection5FieldsProps) {
  const subjects = normalizeProcessedSubjects(data);
  const pdActions = normalizePdActions(data);
  const legalBases = normalizeLegalBases(data);
  const basisLinks = normalizeBasisLinks(data);
  const basisFiles = normalizeBasisFiles(data);

  const subjectNames = subjects.map(s => s.subject);
  const pdSuggestions = Array.from(
    new Set([...DEFAULT_PERSONAL_DATA, ...personalDataSuggestions, ...subjects.flatMap(s => s.personalData)]),
  ).map(v => ({ value: v, label: v }));

  const subjectOptions = Array.from(new Set([...subjectSuggestions, ...subjectNames]))
    .filter(Boolean)
    .map(v => ({ value: v, label: v }));

  const patchSubjects = (entries: ProcessedDataSubjectEntry[]) => {
    onChange({
      processedDataSubjects: entries,
      pdCategories: syncPdCategories(entries),
    });
  };

  const onSubjectsChange = (names: string[]) => {
    const next = names.map(name => {
      const existing = subjects.find(s => s.subject === name);
      return existing || { subject: name, personalData: [] };
    });
    patchSubjects(next);
  };

  const updateSubjectData = (subject: string, personalData: string[]) => {
    patchSubjects(subjects.map(s => (s.subject === subject ? { ...s, personalData } : s)));
  };

  const patchActions = (actions: string[]) => {
    onChange({ pdActions: actions, actions });
  };

  const toggleAction = (key: string, checked: boolean) => {
    patchActions(checked ? [...new Set([...pdActions, key])] : pdActions.filter(k => k !== key));
  };

  const selectAllActions = () => patchActions([...ALL_PD_ACTION_KEYS]);

  const toggleLegalBasis = (value: string, checked: boolean) => {
    const next = checked ? [...new Set([...legalBases, value])] : legalBases.filter(b => b !== value);
    onChange({ legalBases: next });
  };

  const patchBasisLinks = (key: string, links: string[]) => {
    onChange({ legalBasisLinks: { ...basisLinks, [key]: links } });
  };

  const patchBasisFiles = (key: string, files: string[]) => {
    onChange({ legalBasisFiles: { ...basisFiles, [key]: files } });
  };

  const retentionDate = data?.retentionUntilDate
    ? dayjs(data.retentionUntilDate as string)
    : null;

  return (
    <>
      <Title level={5} style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
        ПЕРЕЧЕНЬ ОБРАБАТЫВАЕМЫХ ПЕРСОНАЛЬНЫХ ДАННЫХ ФИЗИЧЕСКИХ ЛИЦ
      </Title>

      <Form.Item label="Категория субъектов">
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="Например: Клиенты"
          value={subjectNames}
          onChange={onSubjectsChange}
          options={subjectOptions}
          tokenSeparators={[',', ';']}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong>{entry.subject}</Text>
            <Button
              type="link"
              size="small"
              onClick={() => updateSubjectData(entry.subject, [])}
              disabled={!entry.personalData.length}
            >
              Очистить поле
            </Button>
          </div>
          <Form.Item
            label="Укажите обрабатываемые персональные данные в рамках процесса"
            style={{ marginBottom: 0 }}
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              value={entry.personalData}
              onChange={tags => updateSubjectData(entry.subject, tags)}
              options={pdSuggestions}
              tokenSeparators={[',', ';']}
            />
          </Form.Item>
        </div>
      ))}

      <Divider />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong>Совершаемые действия с персональными данными</Text>
        <Button type="link" size="small" onClick={selectAllActions}>
          Выбрать всё
        </Button>
      </div>

      {PD_ACTION_GROUPS.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 16 }}>
          {group.title && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              {group.title}
            </Text>
          )}
          <Row gutter={[16, 12]}>
            {group.items.map(item => (
              <Col xs={24} sm={12} lg={8} key={item.key}>
                <Space>
                  <Switch
                    size="small"
                    checked={pdActions.includes(item.key)}
                    onChange={checked => toggleAction(item.key, checked)}
                  />
                  <span>{item.label}</span>
                </Space>
              </Col>
            ))}
          </Row>
        </div>
      ))}

      <Form.Item label="Укажите срок действия" style={{ marginTop: 8 }}>
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="Добавить новое действие"
          value={
            Array.isArray(data?.customPdActions)
              ? (data.customPdActions as string[])
              : data?.customPdActions
                ? [String(data.customPdActions)]
                : []
          }
          onChange={vals => onChange({ customPdActions: vals })}
          tokenSeparators={[',', ';']}
        />
      </Form.Item>

      <Divider />

      <Text strong style={{ display: 'block', marginBottom: 12 }}>
        Основания для обработки персональных данных
      </Text>

      {LEGAL_BASIS_OPTIONS.map(opt => (
        <div key={opt.value} style={{ marginBottom: 8 }}>
          <Checkbox
            checked={legalBases.includes(opt.value)}
            onChange={e => toggleLegalBasis(opt.value, e.target.checked)}
          >
            {opt.label}
          </Checkbox>
          {opt.hasDocs && legalBases.includes(opt.value) && (
            <LegalBasisDocs
              basisKey={opt.value}
              links={basisLinks[opt.value] || []}
              files={basisFiles[opt.value] || []}
              onLinksChange={links => patchBasisLinks(opt.value, links)}
              onFilesChange={files => patchBasisFiles(opt.value, files)}
            />
          )}
        </div>
      ))}

      <Divider />

      <Paragraph strong style={{ marginBottom: 12 }}>
        Срок или условия, когда вы прекратите обработку данных в рамках процесса и удалите или уничтожите их
      </Paragraph>

      <Form.Item>
        <Space>
          <Switch
            checked={!!data?.noRetentionPeriodSet}
            onChange={checked => onChange({ noRetentionPeriodSet: checked })}
          />
          <span>Оператором не установлен срок обработки персональных данных</span>
        </Space>
      </Form.Item>

      {!data?.noRetentionPeriodSet && (
        <>
          <Form.Item label="До определенной даты">
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Добавить дату"
              value={retentionDate as Dayjs | null}
              onChange={d =>
                onChange({
                  retentionUntilDate: d ? d.format('YYYY-MM-DD') : undefined,
                  retentionPeriod: d ? `до ${d.format('DD.MM.YYYY')}` : data?.retentionPeriod,
                })
              }
              format="DD.MM.YYYY"
            />
          </Form.Item>
          <Form.Item label="До определенного события">
            <TextArea
              rows={4}
              value={data?.retentionUntilEvent || data?.retentionPeriod || ''}
              onChange={e => onChange({ retentionUntilEvent: e.target.value, retentionPeriod: e.target.value })}
              placeholder="Опишите условие прекращения обработки и удаления данных"
            />
          </Form.Item>
        </>
      )}

      <Divider />

      <Form.Item
        label="Обрабатываете ли вы специальные категории персональных данных?"
        style={{ marginBottom: 24 }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
          К ним относятся сведения о расовой и национальной принадлежности, политических взглядах,
          религиозных или философских убеждениях, состоянии здоровья, интимной жизни, судимости.
        </Paragraph>
        <Radio.Group
          value={
            data?.specialCategoriesChoice
            ?? (data?.specialCategories ? 'process' : 'not_process')
          }
          onChange={e => {
            const choice = e.target.value as 'process' | 'not_process';
            onChange({
              specialCategoriesChoice: choice,
              specialCategories: choice === 'process',
            });
          }}
        >
          <Space direction="vertical">
            <Radio value="not_process">Не обрабатываем</Radio>
            <Radio value="process">Обрабатываем</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        label="Обрабатываете ли вы биометрические персональные данные?"
        style={{ marginBottom: 24 }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 13 }}>
          Например, отпечатки пальцев, сканеры сетчатки глаза, фото- и видеоизображения лица для
          автоматической идентификации.
        </Paragraph>
        <Radio.Group
          value={
            data?.biometricChoice ?? (data?.biometric ? 'process' : 'not_process')
          }
          onChange={e => {
            const choice = e.target.value as 'process' | 'not_process';
            onChange({
              biometricChoice: choice,
              biometric: choice === 'process',
            });
          }}
        >
          <Space direction="vertical">
            <Radio value="not_process">Не обрабатываем</Radio>
            <Radio value="process">Обрабатываем</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        label="Принимаете ли вы автоматические решения в отношении физических лиц на основании обработки их персональных данных? Например, скоринг, скрининг, биометрическая идентификация и т.д."
        style={{ marginBottom: 0 }}
      >
        <Radio.Group
          value={data?.automatedDecisions ?? 'not_produced'}
          onChange={e => onChange({ automatedDecisions: e.target.value })}
        >
          <Space direction="vertical">
            <Radio value="not_produced">Не производится</Radio>
            <Radio value="produced">Производится</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>
    </>
  );
}
