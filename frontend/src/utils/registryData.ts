import { COLLECTION_METHODS_LEFT, COLLECTION_METHODS_RIGHT } from '../components/ProcessSection4Fields';
import { COUNT_OPTIONS, PROCESSING_METHOD_OPTIONS } from '../components/ProcessSection2Fields';
import { LEGAL_BASIS_OPTIONS, PD_ACTION_GROUPS } from '../components/ProcessSection5Fields';
import type { Company, Process, SectionData } from '../types';

const ACTION_LABELS = Object.fromEntries(
  PD_ACTION_GROUPS.flatMap(g => g.items.map(i => [i.key, i.label])),
);

const COUNT_LABELS = Object.fromEntries(COUNT_OPTIONS.map(o => [o.value, o.label]));
const METHOD_LABELS = Object.fromEntries(PROCESSING_METHOD_OPTIONS.map(o => [o.value, o.label]));
const COLLECTION_LABELS = Object.fromEntries(
  [...COLLECTION_METHODS_LEFT, ...COLLECTION_METHODS_RIGHT].map(o => [o.value, o.label]),
);
const LEGAL_LABELS = Object.fromEntries(LEGAL_BASIS_OPTIONS.map(o => [o.value, o.label]));

function sec(process: Process, n: number): SectionData {
  return process.sections[n]?.data ?? {};
}

function join(parts: (string | undefined | null)[], sep = '; '): string {
  return parts.filter(Boolean).map(String).join(sep);
}

function formatSubjectPd(
  entries: { subject: string; personalData?: string[] }[] | undefined,
): string {
  if (!entries?.length) return '';
  return entries
    .filter(e => e.subject)
    .map(e => {
      const pd = (e.personalData ?? []).filter(Boolean);
      return pd.length ? `${e.subject}: ${pd.join('; ')}` : e.subject;
    })
    .join(' | ');
}

export interface ProcessRegistryRow {
  num: number;
  processId: number;
  companyId: number | null;
  isCorporate: boolean;
  companyName: string;
  processName: string;
  tags: string;
  description: string;
  contactName: string;
  contactPosition: string;
  contactEmail: string;
  regulatingDocs: string;
  macroGoal: string;
  goal: string;
  persons: string;
  count: string;
  sensitivePersons: string;
  minorsCount: string;
  consentObserved: string;
  consentTemplate: string;
  processingMethod: string;
  employees: string;
  sources: string;
  personalData: string;
  specialPd: string;
  specialConsent: string;
  biometricPd: string;
  biometricConsent: string;
  legalBasis: string;
  documentTemplates: string;
  actions: string;
  retentionPeriod: string;
  automatedDecisions: string;
  decisionConditions: string;
  decisionConsentTemplate: string;
  paperTemplates: string;
  paperStorage: string;
  informationSystems: string;
  accessEmployees: string;
  thirdPartyTransfer: string;
  pdInSystems: string;
  endToEndProcess: string;
  transferredToThirdParties: string;
  thirdParties: string;
  thirdPartyCountry: string;
  transferPurpose: string;
  transferRecipients: string;
  transferMethods: string;
  transferBasis: string;
  processingOrder: string;
  additionalInfo: string;
  additionalFiles: string;
  branch: string;
  risks: string;
  critical: string;
}

const TRANSFER_STATUS_LABELS: Record<string, string> = {
  transferred: 'Есть',
  not_transferred: 'Отсутствует',
  received: 'Получаются',
  both: 'Передаются и получаются',
};

const IS_USAGE_LABELS: Record<string, string> = {
  used: 'Используются',
  not_used: 'Не используются',
  no_data: 'Нет данных',
};

export function buildProcessRegistryRows(
  processes: Process[],
  companiesById?: Map<number, import('../types').Company>,
): ProcessRegistryRow[] {
  return processes.map((p, i) => {
    const company = p.companyId != null ? companiesById?.get(p.companyId) : undefined;
    const s1 = sec(p, 1);
    const s2 = sec(p, 2);
    const s3 = sec(p, 3);
    const s4 = sec(p, 4);
    const s5 = sec(p, 5);
    const s6 = sec(p, 6);
    const s7 = sec(p, 7);
    const s8 = sec(p, 8);
    const s9 = sec(p, 9);

    const personGroups = Array.isArray(s2.personGroups)
      ? s2.personGroups
      : s2.persons
        ? String(s2.persons).split(/[,;]/).map(x => x.trim()).filter(Boolean)
        : [];

    const employees = Array.isArray(s3.employeesInvolved)
      ? s3.employeesInvolved
      : typeof s3.employees === 'string'
        ? s3.employees.split(/[,;]/).map(x => x.trim())
        : [];

    const collectionMethods = Array.isArray(s4.collectionMethods)
      ? s4.collectionMethods.map(k => COLLECTION_LABELS[k] || k)
      : [];

    const processedSubjects = Array.isArray(s5.processedDataSubjects)
      ? s5.processedDataSubjects
      : Array.isArray(s5.pdCategories) && s5.pdCategories.length
        ? [{ subject: 'Клиенты', personalData: s5.pdCategories.map(String) }]
        : [];

    const legalBases = Array.isArray(s5.legalBases)
      ? s5.legalBases.map(k => LEGAL_LABELS[k] || k)
      : s5.legalBasis
        ? [String(s5.legalBasis)]
        : [];

    const pdActions = Array.isArray(s5.pdActions)
      ? s5.pdActions
      : Array.isArray(s5.actions)
        ? s5.actions.map(String)
        : [];

    const actionLabels = pdActions.map(k => ACTION_LABELS[k] || k);

    const retention = s5.noRetentionPeriodSet
      ? 'Оператором не установлен срок'
      : join([s5.retentionUntilEvent, s5.retentionUntilDate ? `до ${s5.retentionUntilDate}` : '', s5.retentionPeriod], ' ');

    const specialChoice = s5.specialCategoriesChoice ?? (s5.specialCategories ? 'process' : 'not_process');
    const bioChoice = s5.biometricChoice ?? (s5.biometric ? 'process' : 'not_process');
    const autoDec = s5.automatedDecisions === 'produced' ? 'Производится' : 'Отсутствует';

    const paperDocs = Array.isArray(s6.paperDocuments) ? s6.paperDocuments : [];
    const paperNames = paperDocs.map(d => d.name).filter(Boolean);
    const paperPlaces = paperDocs.map(d => d.storageLocation).filter(Boolean);

    const systems = Array.isArray(s7.informationSystems)
      ? s7.informationSystems
      : Array.isArray(s7.systems)
        ? (s7.systems as string[])
        : [];

    const thirdEntries = Array.isArray(s8.thirdPartyEntries) ? s8.thirdPartyEntries : [];
    const thirdNames = thirdEntries.map(e => e.name).filter(Boolean);
    const receiving = thirdEntries.filter(e => e.receivesFromUs).map(e => e.name);

    const transferStatus = s8.thirdPartyTransfer
      ? TRANSFER_STATUS_LABELS[s8.thirdPartyTransfer] ?? s8.thirdPartyTransfer
      : thirdNames.length
        ? 'Есть'
        : 'Отсутствует';

    const additionalText = join([s9.additionalInfo, s9.additionalNotes], '\n');
    const additionalFiles = [
      ...(Array.isArray(s9.additionalInfoFiles) ? s9.additionalInfoFiles : []),
      ...(Array.isArray(s9.additionalInfoLinks) ? s9.additionalInfoLinks : []),
    ];

    const legalBasisFormatted = processedSubjects.length
      ? processedSubjects
          .map(s => `${s.subject}: ${legalBases.join('; ')}`)
          .join(' | ')
      : legalBases.join('; ');

    const actionsFormatted = processedSubjects.length
      ? processedSubjects.map(s => `${s.subject}: ${actionLabels.join('; ')}`).join(' | ')
      : actionLabels.join('; ');

    return {
      num: i + 1,
      processId: p.id,
      companyId: p.companyId,
      isCorporate: Boolean(p.isCorporate),
      companyName: p.isCorporate
        ? 'Общекорпоративный'
        : (company?.shortName || company?.name || '—'),
      processName: p.name,
      tags: (p.tags ?? []).join(', '),
      description: String(s1.description ?? ''),
      contactName: String(s1.contactName ?? ''),
      contactPosition: String(s1.contactPosition ?? ''),
      contactEmail: String(s1.contactEmail ?? ''),
      regulatingDocs: String(s1.regulatingDocuments ?? ''),
      macroGoal: String(s2.macroGoal ?? ''),
      goal: String(s2.goal ?? ''),
      persons: personGroups.join(', '),
      count: COUNT_LABELS[String(s2.count ?? '')] || String(s2.count ?? '') || 'не выбрано',
      sensitivePersons: s2.hasIncapable ? 'Могут' : 'Отсутствуют',
      minorsCount: '',
      consentObserved: legalBases.includes('consent') || legalBases.some(l => l.includes('Согласие')) ? 'Да' : '',
      consentTemplate: '',
      processingMethod: METHOD_LABELS[String(s2.processingMethod ?? '')] || String(s2.processingMethod ?? ''),
      employees: employees.join('; '),
      sources: collectionMethods.join('; ') || formatSubjectPd(
        Array.isArray(s4.sourceSubjects) ? s4.sourceSubjects : undefined,
      ),
      personalData: formatSubjectPd(processedSubjects),
      specialPd: specialChoice === 'process' ? 'Обрабатываются' : 'Не обрабатываем',
      specialConsent: '',
      biometricPd: bioChoice === 'process' ? 'Обрабатываются' : 'Не обрабатываем',
      biometricConsent: '',
      legalBasis: legalBasisFormatted,
      documentTemplates: '',
      actions: actionsFormatted,
      retentionPeriod: retention,
      automatedDecisions: autoDec,
      decisionConditions: '',
      decisionConsentTemplate: '',
      paperTemplates: paperNames.join('; '),
      paperStorage: paperPlaces.join('; '),
      informationSystems: systems.join('; '),
      accessEmployees: employees.join('; '),
      thirdPartyTransfer: thirdNames.join('; '),
      pdInSystems: formatSubjectPd(processedSubjects),
      endToEndProcess: '',
      transferredToThirdParties: transferStatus,
      thirdParties: thirdNames.join('; '),
      thirdPartyCountry: 'Российская Федерация',
      transferPurpose: receiving.length ? 'в целях передачи данных контрагентам' : '',
      transferRecipients: formatSubjectPd(
        thirdEntries
          .filter(e => e.receivesFromUs)
          .map(e => ({ subject: e.name, personalData: processedSubjects.find(ps => ps.subject)?.personalData })),
      ) || formatSubjectPd(processedSubjects),
      transferMethods: s6.paperDocumentsCreated === 'created' ? 'на бумажных носителях' : collectionMethods[0] ?? '',
      transferBasis: legalBases.find(l => l.includes('Договор')) ?? legalBases[0] ?? '',
      processingOrder: '',
      additionalInfo: additionalText,
      additionalFiles: additionalFiles.join('; '),
      branch: '',
      risks: '',
      critical: '',
    };
  });
}

export interface SystemRegistryRow {
  num: number;
  processName: string;
  usesSystems: string;
  systemName: string;
  pdInSystem: string;
}

export function buildSystemRegistryRows(processes: Process[]): SystemRegistryRow[] {
  const rows: SystemRegistryRow[] = [];
  let n = 0;
  for (const p of processes) {
    const s7 = sec(p, 7);
    const systems = Array.isArray(s7.informationSystems)
      ? s7.informationSystems.map(String)
      : [];
    const usage = IS_USAGE_LABELS[String(s7.informationSystemsUsage ?? '')] ?? '';
    const pd = formatSubjectPd(sec(p, 5).processedDataSubjects as { subject: string; personalData?: string[] }[]);
    if (!systems.length) {
      rows.push({
        num: ++n,
        processName: p.name,
        usesSystems: usage || '—',
        systemName: '',
        pdInSystem: pd,
      });
      continue;
    }
    for (const sys of systems) {
      rows.push({
        num: ++n,
        processName: p.name,
        usesSystems: usage || 'Используются',
        systemName: sys,
        pdInSystem: pd,
      });
    }
  }
  return rows;
}

export interface CounterpartyRegistryRow {
  num: number;
  processName: string;
  name: string;
  country: string;
  purpose: string;
  basis: string;
  receivesFromUs: string;
}

export function buildCounterpartyRegistryRows(processes: Process[]): CounterpartyRegistryRow[] {
  const rows: CounterpartyRegistryRow[] = [];
  let n = 0;
  for (const p of processes) {
    const s8 = sec(p, 8);
    const entries = Array.isArray(s8.thirdPartyEntries) ? s8.thirdPartyEntries : [];
    if (!entries.length) continue;
    for (const e of entries) {
      rows.push({
        num: ++n,
        processName: p.name,
        name: e.name,
        country: 'Российская Федерация',
        purpose: String(sec(p, 2).goal ?? ''),
        basis: 'Договор',
        receivesFromUs: e.receivesFromUs ? 'Да' : 'Нет',
      });
    }
  }
  return rows;
}

export interface SiteRegistryRow {
  num: number;
  type: string;
  name: string;
  url: string;
}

export function buildSiteRegistryRows(company: Company): SiteRegistryRow[] {
  const rows: SiteRegistryRow[] = [];
  let n = 0;
  for (const s of company.sites ?? []) {
    rows.push({ num: ++n, type: 'Сайт', name: s.name, url: s.url });
  }
  for (const a of company.apps ?? []) {
    rows.push({ num: ++n, type: 'Приложение', name: a.name, url: a.url });
  }
  return rows;
}

export interface CrossBorderRegistryRow {
  num: number;
  processName: string;
  crossBorder: string;
  countries: string;
  purpose: string;
}

export function buildCrossBorderRegistryRows(processes: Process[], company: Company): CrossBorderRegistryRow[] {
  return processes.map((p, i) => ({
    num: i + 1,
    processName: p.name,
    crossBorder: company.hasCrossBorder ? 'Да' : 'Нет',
    countries: '',
    purpose: String(sec(p, 2).goal ?? ''),
  }));
}

export interface ExecutorRegistryRow {
  num: number;
  processName: string;
  executor: string;
  hasOrder: string;
  purpose: string;
}

export function buildExecutorRegistryRows(processes: Process[]): ExecutorRegistryRow[] {
  return processes.map((p, i) => {
    const s8 = sec(p, 8);
    const names = Array.isArray(s8.thirdPartyEntries)
      ? s8.thirdPartyEntries.map(e => e.name).join('; ')
      : '';
    return {
      num: i + 1,
      processName: p.name,
      executor: names,
      hasOrder: '',
      purpose: String(sec(p, 2).goal ?? ''),
    };
  });
}

export interface ServerRegistryRow {
  num: number;
  processName: string;
  systemName: string;
  serverRole: string;
  location: string;
}

export function buildServerRegistryRows(processes: Process[]): ServerRegistryRow[] {
  const rows: ServerRegistryRow[] = [];
  let n = 0;
  for (const p of processes) {
    const systems = Array.isArray(sec(p, 7).informationSystems)
      ? sec(p, 7).informationSystems!.map(String)
      : [];
    for (const sys of systems) {
      rows.push({
        num: ++n,
        processName: p.name,
        systemName: sys,
        serverRole: '',
        location: '',
      });
    }
  }
  return rows;
}
