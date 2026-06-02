import { Form, Input, Radio, Select } from 'antd';
import type { SectionData } from '../types';

const { TextArea } = Input;

export const MACRO_GOALS = [
  'Ведение основной деятельности',
  'Управление персоналом',
  'Маркетинг',
  'Финансовый учёт',
  'Безопасность',
];

export const COUNT_OPTIONS = [
  { value: 'less1k', label: 'менее 1 тысячи' },
  { value: 'less10k', label: 'менее 10 тысяч' },
  { value: 'less100k', label: 'менее 100 тысяч' },
  { value: 'more100k', label: 'более 100 тысяч' },
];

export const PROCESSING_METHOD_OPTIONS = [
  { value: 'automated', label: 'Автоматизированная' },
  { value: 'non_automated', label: 'Неавтоматизированная' },
  { value: 'mixed', label: 'Смешанная' },
];

const MARKETING_QUESTION =
  'Цель связана с продвижением товаров, работ, услуг на рынке путем осуществления прямых контактов с потенциальным потребителем с помощью средств связи, а также с политической агитацией?';

function normalizePersonGroups(data: SectionData | undefined): string[] {
  if (Array.isArray(data?.personGroups) && data.personGroups.length > 0) {
    return data.personGroups.map(String);
  }
  const legacy = data?.persons;
  if (typeof legacy === 'string' && legacy.trim()) {
    return legacy.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export interface ProcessSection2FieldsProps {
  data: SectionData | undefined;
  onChange: (patch: Partial<SectionData>) => void;
}

export default function ProcessSection2Fields({ data, onChange }: ProcessSection2FieldsProps) {
  const personGroups = normalizePersonGroups(data);

  const patchPersonGroups = (groups: string[]) => {
    onChange({
      personGroups: groups,
      persons: groups.join(', '),
    });
  };

  const marketingValue =
    data?.isMarketingRelated === true ? 'yes' : data?.isMarketingRelated === false ? 'no' : undefined;

  const incapableValue =
    data?.hasIncapable === true ? 'yes' : data?.hasIncapable === false ? 'no' : undefined;

  return (
    <>
      <Form.Item label="Цель обработки персональных данных">
        <TextArea
          rows={4}
          value={data?.goal || ''}
          onChange={e => onChange({ goal: e.target.value })}
          placeholder="Доставка товара клиентам"
        />
      </Form.Item>

      <Form.Item label={MARKETING_QUESTION}>
        <Radio.Group
          value={marketingValue}
          onChange={e => onChange({ isMarketingRelated: e.target.value === 'yes' })}
        >
          <Radio value="yes">Да</Radio>
          <Radio value="no">Нет</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="Группы физических лиц, чьи данные обрабатываются для указанной цели">
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="Добавьте группу, например: Клиенты"
          value={personGroups}
          onChange={patchPersonGroups}
          tokenSeparators={[',', ';']}
          options={[]}
        />
      </Form.Item>

      <Form.Item label="Укажите макроцель">
        <Select
          placeholder="Выберите..."
          value={data?.macroGoal || undefined}
          onChange={v => onChange({ macroGoal: v })}
          options={MACRO_GOALS.map(g => ({ value: g, label: g }))}
          allowClear
        />
      </Form.Item>

      <Form.Item label="Укажите примерное количество физических лиц, чьи персональные данные обрабатываются в этом процессе">
        <Radio.Group
          value={data?.count || undefined}
          onChange={e => onChange({ count: e.target.value })}
        >
          {COUNT_OPTIONS.map(opt => (
            <Radio key={opt.value} value={opt.value} style={{ display: 'block', marginBottom: 4 }}>
              {opt.label}
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>

      <Form.Item label="Среди указанных групп физических лиц могут быть недееспособные лица (несовершеннолетние до 14 лет и т.д.)?">
        <Radio.Group
          value={incapableValue}
          onChange={e => onChange({ hasIncapable: e.target.value === 'yes' })}
        >
          <Radio value="yes">Могут</Radio>
          <Radio value="no">Не могут</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="Способ обработки персональных данных">
        <Radio.Group
          value={data?.processingMethod || undefined}
          onChange={e => onChange({ processingMethod: e.target.value })}
        >
          {PROCESSING_METHOD_OPTIONS.map(opt => (
            <Radio key={opt.value} value={opt.value}>
              {opt.label}
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>
    </>
  );
}
