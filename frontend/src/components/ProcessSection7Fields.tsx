import { Form, Radio, Select, Space } from 'antd';
import type { SectionData } from '../types';

const MAIN_QUESTION =
  'Используются ли в рамках данного процесса информационные системы для обработки персональных данных?';

function normalizeSystemNames(data: SectionData | undefined): string[] {
  if (Array.isArray(data?.informationSystems) && data.informationSystems.length > 0) {
    return data.informationSystems.map(String);
  }
  const legacy = data?.systems;
  if (Array.isArray(legacy)) return legacy.map(String);
  if (typeof legacy === 'string' && legacy.trim()) {
    return legacy.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export interface ProcessSection7FieldsProps {
  data: SectionData | undefined;
  onChange: (patch: Partial<SectionData>) => void;
  systemSuggestions?: string[];
}

export default function ProcessSection7Fields({
  data,
  onChange,
  systemSuggestions = [],
}: ProcessSection7FieldsProps) {
  const usage =
    data?.informationSystemsUsage
    ?? (normalizeSystemNames(data).length > 0 ? 'used' : undefined);

  const systemNames = normalizeSystemNames(data);

  const options = Array.from(new Set([...systemSuggestions, ...systemNames]))
    .filter(Boolean)
    .map(v => ({ value: v, label: v }));

  return (
    <>
      <Form.Item label={MAIN_QUESTION}>
        <Radio.Group
          value={usage}
          onChange={e => {
            const v = e.target.value as 'used' | 'not_used' | 'no_data';
            onChange({
              informationSystemsUsage: v,
              ...(v !== 'used' ? { informationSystems: [], systems: [] } : {}),
            });
          }}
        >
          <Space direction="vertical">
            <Radio value="used">Используются</Radio>
            <Radio value="not_used">Не используются</Radio>
            <Radio value="no_data">Нет данных</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      {usage === 'used' && (
        <Form.Item label="Наименование информационной системы, используемой в рамках процесса">
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="Начните вводить наименование новой информационной системы"
            value={systemNames}
            onChange={vals => onChange({ informationSystems: vals, systems: vals })}
            options={options}
            tokenSeparators={[',', ';']}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? option?.value ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Form.Item>
      )}
    </>
  );
}
