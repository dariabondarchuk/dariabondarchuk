import { useState } from 'react';
import { Button, Input, Space, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { lookupPartyByInn, type CompanyDadataPatch } from '../api/dadata';

const { Text } = Typography;

interface DadataLookupProps {
  defaultQuery?: string;
  onLoaded: (data: CompanyDadataPatch, query?: string) => void;
  lookup?: (query: string) => Promise<CompanyDadataPatch>;
  buttonText?: string;
  hint?: string;
}

export default function DadataLookup({
  defaultQuery = '',
  onLoaded,
  lookup = lookupPartyByInn,
  buttonText = 'Найти в DaData',
  hint,
}: DadataLookupProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Введите ИНН, ОГРН или название организации');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await lookup(trimmed);
      onLoaded(data, trimmed);
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      const text = msg || 'Не удалось получить данные из DaData';
      setError(text.includes('SUGGESTIONS')
        ? `${text}. Откройте личный кабинет DaData → Профиль → подключите API «Подсказки» для вашего токена.`
        : text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder="ИНН, ОГРН или название"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            if (error) setError('');
          }}
          onPressEnter={handleLookup}
          allowClear
        />
        <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={handleLookup}>
          {buttonText}
        </Button>
      </Space.Compact>
      {hint && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
          {hint}
        </Text>
      )}
      {error && (
        <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
          {error}
        </Text>
      )}
    </div>
  );
}
