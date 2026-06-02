import { Form, Select, Typography } from 'antd';
import type { SectionData } from '../types';

const { Paragraph } = Typography;

const INSTRUCTION =
  'Укажите должности сотрудников и/или структурные подразделения, участвующие в обработке персональных данных в текущем процессе';

function normalizeEmployeesInvolved(data: SectionData | undefined): string[] {
  if (Array.isArray(data?.employeesInvolved) && data.employeesInvolved.length > 0) {
    return data.employeesInvolved.map(String);
  }
  if (Array.isArray(data?.employees) && data.employees.length > 0) {
    return (data.employees as unknown[]).map(String);
  }
  const legacy = data?.employees;
  if (typeof legacy === 'string' && legacy.trim()) {
    const parts = legacy.includes(';')
      ? legacy.split(';')
      : legacy.includes(',')
        ? legacy.split(',')
        : legacy.split('\n');
    return parts.map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export interface ProcessSection3FieldsProps {
  data: SectionData | undefined;
  onChange: (patch: Partial<SectionData>) => void;
  /** Подсказки из анкеты компании (отделы / должности) */
  suggestions?: string[];
}

export default function ProcessSection3Fields({ data, onChange, suggestions = [] }: ProcessSection3FieldsProps) {
  const values = normalizeEmployeesInvolved(data);

  const patchValues = (items: string[]) => {
    onChange({
      employeesInvolved: items,
      employees: items.join('; '),
    });
  };

  const optionSet = new Set([...suggestions, ...values]);
  const options = Array.from(optionSet)
    .filter(Boolean)
    .map(v => ({ value: v, label: v }));

  return (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {INSTRUCTION}
      </Paragraph>

      <Form.Item label="Должности и подразделения">
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="Начните вводить должности сотрудников и/или названия подразделений"
          value={values}
          onChange={patchValues}
          options={options}
          tokenSeparators={[';', ',']}
          filterOption={(input, option) =>
            String(option?.label ?? option?.value ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          showSearch
          allowClear
        />
      </Form.Item>
    </>
  );
}
