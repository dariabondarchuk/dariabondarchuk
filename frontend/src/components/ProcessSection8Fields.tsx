import { Divider, Form, Radio, Select, Space, Typography } from 'antd';
import type { SectionData, ThirdPartyEntry } from '../types';

const { Text } = Typography;

const MAIN_QUESTION =
  'Передаются ли персональные данные третьим лицам или поручается ли обработка персональных данных третьим лицам?';

function normalizeThirdParties(data: SectionData | undefined): ThirdPartyEntry[] {
  if (Array.isArray(data?.thirdPartyEntries) && data.thirdPartyEntries.length > 0) {
    return data.thirdPartyEntries.map(row => ({
      name: String(row.name || ''),
      receivesFromUs: row.receivesFromUs !== false,
      providesToUs: !!row.providesToUs,
    }));
  }
  const legacy = data?.thirdParties;
  if (Array.isArray(legacy)) {
    return legacy.map(name => ({
      name: String(name),
      receivesFromUs: true,
      providesToUs: false,
    }));
  }
  if (typeof legacy === 'string' && legacy.trim()) {
    return legacy.split(/[,;]/).map(s => ({
      name: s.trim(),
      receivesFromUs: true,
      providesToUs: false,
    })).filter(e => e.name);
  }
  return [];
}

function entriesToLegacyNames(entries: ThirdPartyEntry[]): string[] {
  return entries.map(e => e.name).filter(Boolean);
}

export interface ProcessSection8FieldsProps {
  data: SectionData | undefined;
  onChange: (patch: Partial<SectionData>) => void;
  nameSuggestions?: string[];
}

export default function ProcessSection8Fields({
  data,
  onChange,
  nameSuggestions = [],
}: ProcessSection8FieldsProps) {
  const transferStatus =
    data?.thirdPartyTransfer
    ?? (normalizeThirdParties(data).length > 0 ? 'transferred' : undefined);

  const entries = normalizeThirdParties(data);
  const allNames = entries.map(e => e.name);

  const receivingFromUs = entries.filter(e => e.receivesFromUs).map(e => e.name);
  const providingToUs = entries.filter(e => e.providesToUs).map(e => e.name);

  const patchEntries = (list: ThirdPartyEntry[]) => {
    onChange({
      thirdPartyEntries: list,
      thirdParties: entriesToLegacyNames(list),
    });
  };

  const onAllNamesChange = (names: string[]) => {
    const next = names.map(name => {
      const existing = entries.find(e => e.name === name);
      return (
        existing || {
          name,
          receivesFromUs: true,
          providesToUs: false,
        }
      );
    });
    patchEntries(next);
  };

  const setReceivingFromUs = (names: string[]) => {
    patchEntries(
      entries.map(e => ({
        ...e,
        receivesFromUs: names.includes(e.name),
      })),
    );
  };

  const setProvidingToUs = (names: string[]) => {
    patchEntries(
      entries.map(e => ({
        ...e,
        providesToUs: names.includes(e.name),
      })),
    );
  };

  const nameOptions = Array.from(new Set([...nameSuggestions, ...allNames]))
    .filter(Boolean)
    .map(v => ({ value: v, label: v }));

  const showParties = transferStatus === 'transferred' || transferStatus === 'received' || transferStatus === 'both';

  return (
    <>
      <Form.Item label={MAIN_QUESTION}>
        <Radio.Group
          value={transferStatus}
          onChange={e => {
            const v = e.target.value as 'transferred' | 'not_transferred' | 'received' | 'both';
            onChange({
              thirdPartyTransfer: v,
              ...(v === 'not_transferred' ? { thirdPartyEntries: [], thirdParties: [] } : {}),
            });
          }}
        >
          <Space direction="vertical">
            <Radio value="transferred">Передаются</Radio>
            <Radio value="not_transferred">Не передаются</Radio>
            <Radio value="received">Получаются от третьих лиц</Radio>
            <Radio value="both">Передаются и получаются</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      {showParties && (
        <>
          <Form.Item label="Наименование третьего лица">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Например: Транспортные компании (контрагенты)"
              value={allNames}
              onChange={onAllNamesChange}
              options={nameOptions}
              tokenSeparators={[',', ';']}
              showSearch
            />
          </Form.Item>

          {allNames.length > 0 && (
            <>
              <Divider style={{ margin: '8px 0 16px' }} />

              <Form.Item
                label={
                  <Text strong style={{ textTransform: 'uppercase', fontSize: 12 }}>
                    Получает данные от нас
                  </Text>
                }
              >
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Выберите третьих лиц"
                  value={receivingFromUs}
                  onChange={setReceivingFromUs}
                  options={allNames.map(n => ({ value: n, label: n.toUpperCase() }))}
                />
              </Form.Item>

              <Form.Item
                label={
                  <Text strong style={{ textTransform: 'uppercase', fontSize: 12 }}>
                    Передаёт данные нам
                  </Text>
                }
              >
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Выберите третьих лиц"
                  value={providingToUs}
                  onChange={setProvidingToUs}
                  options={allNames.map(n => ({ value: n, label: n.toUpperCase() }))}
                />
              </Form.Item>
            </>
          )}
        </>
      )}
    </>
  );
}
