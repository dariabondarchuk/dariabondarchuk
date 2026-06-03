import type { CSSProperties } from 'react';
import { Select } from 'antd';
import { useApp } from '../context/AppContext';

interface CompanySearchSelectProps {
  value?: number;
  onChange?: (companyId: number | undefined) => void;
  disabled?: boolean;
  style?: CSSProperties;
  /** Ограничить список указанными id (например, компании без уведомления РКН) */
  includeCompanyIds?: number[];
}

export default function CompanySearchSelect({
  value,
  onChange,
  disabled,
  style,
  includeCompanyIds,
}: CompanySearchSelectProps) {
  const { state } = useApp();

  const companies = includeCompanyIds
    ? state.companies.filter(c => includeCompanyIds.includes(c.id))
    : state.companies;

  const options = companies.map(c => ({
    value: c.id,
    label: `${c.shortName || c.name}${c.inn ? ` · ИНН ${c.inn}` : ''}${c.ogrn ? ` · ОГРН ${c.ogrn}` : ''}`,
  }));

  return (
    <Select
      showSearch
      allowClear
      placeholder="Поиск по названию, ИНН или ОГРН"
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      style={{ width: '100%', maxWidth: 560, ...style }}
      filterOption={(input, option) => {
        const c = companies.find(x => x.id === option?.value);
        if (!c) return false;
        const hay = `${c.name} ${c.shortName ?? ''} ${c.inn ?? ''} ${c.ogrn ?? ''}`.toLowerCase();
        return hay.includes(input.trim().toLowerCase());
      }}
    />
  );
}
