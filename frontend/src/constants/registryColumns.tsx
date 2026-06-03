import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import {
  buildCounterpartyRegistryRows,
  buildCrossBorderRegistryRows,
  buildExecutorRegistryRows,
  buildProcessRegistryRows,
  buildServerRegistryRows,
  buildSiteRegistryRows,
  buildSystemRegistryRows,
  type CounterpartyRegistryRow,
  type CrossBorderRegistryRow,
  type ExecutorRegistryRow,
  type ProcessRegistryRow,
  type ServerRegistryRow,
  type SiteRegistryRow,
  type SystemRegistryRow,
} from '../utils/registryData';
import type { Company, Process } from '../types';

export type RegistryTabKey =
  | 'processes'
  | 'systems'
  | 'counterparties'
  | 'sites'
  | 'crossborder'
  | 'executors'
  | 'servers';

export const REGISTRY_TABS: { key: RegistryTabKey; label: string }[] = [
  { key: 'processes', label: 'Процессы' },
  { key: 'systems', label: 'Информационные системы' },
  { key: 'counterparties', label: 'Контрагенты' },
  { key: 'sites', label: 'Информация о дополнительных сайтах' },
  { key: 'crossborder', label: 'Трансграничная передача' },
  { key: 'executors', label: 'Исполнители' },
  { key: 'servers', label: 'Серверы' },
];

function processNameCell(name: string): ReactNode {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        background: '#e6f4ff',
        color: '#1677ff',
        borderRadius: 4,
        fontWeight: 550,
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </span>
  );
}

function cellText(value: string): ReactNode {
  if (!value) return '—';
  return <span style={{ color: value.includes(':') ? '#1677ff' : undefined }}>{value}</span>;
}

type ColDef<T> = { key: keyof T | 'num'; title: string; width?: number; render?: (row: T) => ReactNode };

function toColumns<T extends { num: number }>(defs: ColDef<T>[]): ColumnsType<T> {
  return defs.map(def => ({
    key: String(def.key),
    title: def.title,
    width: def.width,
    dataIndex: def.key === 'num' ? 'num' : undefined,
    fixed: def.key === 'num' ? ('left' as const) : def.key === 'processName' ? ('left' as const) : undefined,
    render: (_: unknown, row: T) => {
      if (def.render) return def.render(row);
      const value = row[def.key as keyof T];
      return cellText(String(value ?? ''));
    },
  }));
}

const PROCESS_COLS: ColDef<ProcessRegistryRow>[] = [
  { key: 'num', title: '№', width: 56 },
  { key: 'companyName', title: 'Компания / тип', width: 200 },
  { key: 'processName', title: 'Название процесса', width: 220, render: r => processNameCell(r.processName) },
  { key: 'tags', title: 'Теги', width: 120 },
  { key: 'description', title: 'Описание процесса', width: 220 },
  { key: 'contactName', title: 'Контактное лицо', width: 160 },
  { key: 'contactPosition', title: 'Должность', width: 140 },
  { key: 'contactEmail', title: 'Email контактного лица', width: 180 },
  { key: 'regulatingDocs', title: 'Документы, регламентирующие процесс', width: 220 },
  { key: 'macroGoal', title: 'Макроцель', width: 200 },
  { key: 'goal', title: 'Цель обработки ПДн', width: 200 },
  { key: 'persons', title: 'Категории субъектов', width: 140 },
  { key: 'count', title: 'Количество физ. лиц', width: 150 },
  { key: 'sensitivePersons', title: 'Наличие особо чувствительных физ. лиц', width: 220 },
  { key: 'minorsCount', title: 'Кол-во несовершеннолетних физ. лиц', width: 200 },
  { key: 'consentObserved', title: 'Соблюдается согласие?', width: 160 },
  { key: 'consentTemplate', title: 'Шаблон согласия', width: 160 },
  { key: 'processingMethod', title: 'Способ обработки ПДн', width: 180 },
  { key: 'employees', title: 'Сотрудники, участвующие в обработке ПДн', width: 240 },
  { key: 'sources', title: 'Источник получения ПДн', width: 180 },
  { key: 'personalData', title: 'Персональные данные', width: 280 },
  { key: 'specialPd', title: 'Специальные ПДн', width: 140 },
  { key: 'specialConsent', title: 'Согласие на специальные ПДн', width: 180 },
  { key: 'biometricPd', title: 'Биометрические ПДн', width: 160 },
  { key: 'biometricConsent', title: 'Согласие на биометрические ПДн', width: 200 },
  { key: 'legalBasis', title: 'Основание для обработки ПДн', width: 260 },
  { key: 'documentTemplates', title: 'Шаблоны документов для обработки ПДн', width: 240 },
  { key: 'actions', title: 'Действия над ПДн', width: 320 },
  { key: 'retentionPeriod', title: 'Срок прекращения обработки ПДн', width: 220 },
  { key: 'automatedDecisions', title: 'Производится ли автоматизированное принятие решений', width: 280 },
  { key: 'decisionConditions', title: 'Соблюдаются ли условия принятия решений', width: 240 },
  { key: 'decisionConsentTemplate', title: 'Шаблон согласия на принятие решений', width: 240 },
  { key: 'paperTemplates', title: 'Шаблоны бумажных документов', width: 220 },
  { key: 'paperStorage', title: 'Место хранения бумажных документов', width: 240 },
  { key: 'informationSystems', title: 'Информационные системы', width: 200 },
  { key: 'accessEmployees', title: 'Сотрудники и отделы (информация о доступе)', width: 260 },
  { key: 'thirdPartyTransfer', title: 'Третьи лица (информация о передаче)', width: 240 },
  { key: 'pdInSystems', title: 'ПДн в информационных системах', width: 220 },
  { key: 'endToEndProcess', title: 'Сквозной процесс', width: 160 },
  { key: 'transferredToThirdParties', title: 'Передаются ПДн третьим лицам?', width: 200 },
  { key: 'thirdParties', title: 'Третьи лица', width: 200 },
  { key: 'thirdPartyCountry', title: 'Страна нахождения третьего лица', width: 200 },
  { key: 'transferPurpose', title: 'Цель передачи ПДн', width: 220 },
  { key: 'transferRecipients', title: 'Получатели ПДн', width: 280 },
  { key: 'transferMethods', title: 'Способы передачи ПДн', width: 200 },
  { key: 'transferBasis', title: 'Основание для передачи ПДн', width: 200 },
  { key: 'processingOrder', title: 'Наличие поручения на обработку', width: 200 },
  { key: 'additionalInfo', title: 'Дополнительная информация', width: 200 },
  { key: 'additionalFiles', title: 'Файлы доп. информации', width: 180 },
  { key: 'branch', title: 'Филиал, дочерняя организация', width: 180 },
  { key: 'risks', title: 'Выявленные риски', width: 160 },
  { key: 'critical', title: 'Критический', width: 120 },
];

export function getRegistryTableConfig(
  tab: RegistryTabKey,
  processes: Process[],
  company: Company,
  companiesById?: Map<number, Company>,
) {
  switch (tab) {
    case 'processes':
      return {
        rows: buildProcessRegistryRows(processes, companiesById),
        columns: toColumns(PROCESS_COLS),
        columnKeys: PROCESS_COLS.map(c => String(c.key)),
      };
    case 'systems':
      return {
        rows: buildSystemRegistryRows(processes),
        columns: toColumns<SystemRegistryRow>([
          { key: 'num', title: '№', width: 56 },
          { key: 'processName', title: 'Название процесса', width: 220, render: r => processNameCell(r.processName) },
          { key: 'usesSystems', title: 'Используются ИС?', width: 160 },
          { key: 'systemName', title: 'Наименование информационной системы', width: 260 },
          { key: 'pdInSystem', title: 'ПДн в информационной системе', width: 280 },
        ]),
        columnKeys: ['num', 'processName', 'usesSystems', 'systemName', 'pdInSystem'],
      };
    case 'counterparties':
      return {
        rows: buildCounterpartyRegistryRows(processes),
        columns: toColumns<CounterpartyRegistryRow>([
          { key: 'num', title: '№', width: 56 },
          { key: 'processName', title: 'Название процесса', width: 220, render: r => processNameCell(r.processName) },
          { key: 'name', title: 'Контрагент', width: 220 },
          { key: 'country', title: 'Страна', width: 160 },
          { key: 'purpose', title: 'Цель передачи ПДн', width: 220 },
          { key: 'basis', title: 'Основание', width: 180 },
          { key: 'receivesFromUs', title: 'Получает данные от нас', width: 220 },
        ]),
        columnKeys: ['num', 'processName', 'name', 'country', 'purpose', 'basis', 'receivesFromUs'],
      };
    case 'sites':
      return {
        rows: buildSiteRegistryRows(company),
        columns: toColumns<SiteRegistryRow>([
          { key: 'num', title: '№', width: 56 },
          { key: 'type', title: 'Тип', width: 140 },
          { key: 'name', title: 'Наименование', width: 240 },
          { key: 'url', title: 'URL', width: 280 },
        ]),
        columnKeys: ['num', 'type', 'name', 'url'],
      };
    case 'crossborder':
      return {
        rows: buildCrossBorderRegistryRows(processes, company),
        columns: toColumns<CrossBorderRegistryRow>([
          { key: 'num', title: '№', width: 56 },
          { key: 'processName', title: 'Название процесса', width: 220, render: r => processNameCell(r.processName) },
          { key: 'crossBorder', title: 'Трансграничная передача', width: 180 },
          { key: 'countries', title: 'Страны', width: 160 },
          { key: 'purpose', title: 'Цель передачи', width: 220 },
        ]),
        columnKeys: ['num', 'processName', 'crossBorder', 'countries', 'purpose'],
      };
    case 'executors':
      return {
        rows: buildExecutorRegistryRows(processes),
        columns: toColumns<ExecutorRegistryRow>([
          { key: 'num', title: '№', width: 56 },
          { key: 'processName', title: 'Название процесса', width: 220, render: r => processNameCell(r.processName) },
          { key: 'executor', title: 'Исполнитель', width: 220 },
          { key: 'hasOrder', title: 'Наличие поручения', width: 180 },
          { key: 'purpose', title: 'Цель обработки', width: 220 },
        ]),
        columnKeys: ['num', 'processName', 'executor', 'hasOrder', 'purpose'],
      };
    case 'servers':
      return {
        rows: buildServerRegistryRows(processes),
        columns: toColumns<ServerRegistryRow>([
          { key: 'num', title: '№', width: 56 },
          { key: 'processName', title: 'Название процесса', width: 220, render: r => processNameCell(r.processName) },
          { key: 'systemName', title: 'Информационная система', width: 220 },
          { key: 'serverRole', title: 'Роль сервера', width: 160 },
          { key: 'location', title: 'Место размещения', width: 180 },
        ]),
        columnKeys: ['num', 'processName', 'systemName', 'serverRole', 'location'],
      };
  }
}

export function exportRegistryCsv(
  rows: Record<string, unknown>[],
  columns: { key: string; title: string }[],
) {
  const header = columns.map(c => `"${c.title.replace(/"/g, '""')}"`).join(';');
  const body = rows.map(row =>
    columns.map(c => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(';'),
  ).join('\n');
  const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reestr.csv';
  a.click();
  URL.revokeObjectURL(url);
}
