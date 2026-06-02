export interface AdditionalProcessContact {
  email: string;
}

export interface SourceSubjectEntry {
  subject: string;
  personalData: string[];
}

export interface ProcessedDataSubjectEntry {
  subject: string;
  personalData: string[];
}

export interface ThirdPartyEntry {
  name: string;
  receivesFromUs?: boolean;
  providesToUs?: boolean;
}

export interface PaperDocumentEntry {
  name: string;
  storageLocation?: string;
  formApproved?: boolean;
  formApprovedChoice?: 'yes' | 'no';
  incompatiblePurposesChoice?: 'yes' | 'no';
  links?: string[];
  templateFiles?: string[];
}

export interface SectionData {
  description?: string;
  contactName?: string;
  contactPosition?: string;
  contactEmail?: string;
  additionalContacts?: AdditionalProcessContact[];
  additionalContactEmails?: string;
  regulatingDocuments?: string;
  macroGoal?: string;
  goal?: string;
  persons?: string;
  personGroups?: string[];
  isMarketingRelated?: boolean;
  count?: string;
  hasIncapable?: boolean;
  processingMethod?: 'automated' | 'non_automated' | 'mixed' | string;
  employeesInvolved?: string[];
  employees?: string | string[];
  pdSourceType?: string;
  sourceSubjects?: SourceSubjectEntry[];
  collectionMethods?: string[];
  sources?: string[];
  processedDataSubjects?: ProcessedDataSubjectEntry[];
  pdCategories?: string[];
  pdActions?: string[];
  customPdActions?: string | string[];
  legalBases?: string[];
  legalBasisLinks?: Record<string, string[]>;
  legalBasisFiles?: Record<string, string[]>;
  specialCategories?: boolean;
  specialCategoriesChoice?: 'process' | 'not_process';
  biometric?: boolean;
  biometricChoice?: 'process' | 'not_process';
  automatedDecisions?: 'produced' | 'not_produced';
  consentRequired?: boolean;
  legalBasis?: string;
  actions?: string[];
  noRetentionPeriodSet?: boolean;
  retentionUntilDate?: string;
  retentionUntilEvent?: string;
  retentionPeriod?: string;
  paperDocumentsCreated?: 'created' | 'not_created';
  paperDocuments?: PaperDocumentEntry[];
  lnaStorageAccessEstablished?: boolean;
  carriersStoredSeparately?: boolean;
  carriersStoredSeparatelyChoice?: 'yes' | 'no';
  informationSystemsUsage?: 'used' | 'not_used' | 'no_data';
  informationSystems?: string[];
  systems?: string | string[];
  thirdPartyTransfer?: 'transferred' | 'not_transferred' | 'received' | 'both';
  thirdPartyEntries?: ThirdPartyEntry[];
  thirdParties?: string | string[];
  additionalInfo?: string;
  additionalNotes?: string;
  additionalInfoLinks?: string[];
  additionalInfoFiles?: string[];
  [key: string]: unknown;
}

export interface ProcessSection {
  status: string;
  data: SectionData;
}

export interface Company {
  id: number;
  name: string;
  shortName: string;
  inn: string;
  ogrn: string;
  okved: string;
  activity: string;
  ceo: string;
  ceoPosition: string;
  phone: string;
  email: string;
  legalAddress: string;
  postalAddress: string;
  city: string;
  pdStartDate: string;
  isOperator: boolean;
  hasCrossBorder: boolean;
  hasDirectories?: boolean;
  contactEmail: string;
  offices: { name: string; address: string }[];
  sites: { name: string; url: string }[];
  apps: { name: string; url: string }[];
}

export interface Responsible {
  id: number;
  companyId: number;
  role: string;
  fio: string;
  position: string;
  email: string;
  phone: string;
  isSecurity: boolean;
  controlsCompliance: boolean;
  informsEmployees: boolean;
  handlesRequests: boolean;
}

export interface Process {
  id: number;
  companyId: number;
  name: string;
  tags: string[];
  status: string;
  sentTo: string;
  sentAt: string;
  anketaType?: string;
  sections: Record<number, ProcessSection>;
}

export interface RknFile {
  id?: number;
  name: string;
  date: string;
  current: boolean;
}

export interface RknNotification {
  id: number;
  companyId: number;
  dateSubmit: string;
  dateChange: string;
  status: string;
  files: RknFile[];
}

export interface JournalEntry {
  id: number;
  companyId: number;
  type: string;
  dateIn: string;
  dateOut: string;
  sender: string;
  content: string;
  answer: string;
  status: string;
  hasContentFile?: boolean;
  hasAnswerFile?: boolean;
  contentFileName?: string | null;
  answerFileName?: string | null;
  additionalFiles?: { name: string; index: number }[];
  displayStatus?: string;
}

export interface MonitorEvent {
  id: number;
  date: string;
  companyId: number;
  type: string;
  old: string;
  newVal: string;
  read: boolean;
}

export interface Document {
  id: number;
  companyId: number;
  name: string;
  type: string;
  filePath?: string | null;
  uploadDate?: string;
  hasFile?: boolean;
}

export interface AppState {
  companies: Company[];
  responsibles: Responsible[];
  processes: Process[];
  rknNotifications: RknNotification[];
  journalEntries: JournalEntry[];
  monitorEvents: MonitorEvent[];
  documents: Document[];
  nextId: number;
}

export type AppAction =
  | { type: 'HYDRATE'; data: Partial<AppState> }
  | { type: 'UPDATE_COMPANY'; id: number; data: Partial<Company> }
  | { type: 'UPDATE_RESPONSIBLE'; id: number; data: Partial<Responsible> }
  | { type: 'UPDATE_PROCESS_SECTION'; processId: number; section: number; status?: string; data: SectionData }
  | { type: 'UPDATE_PROCESS'; id: number; data: Partial<Process> }
  | { type: 'ADD_PROCESS'; companyId: number; name?: string }
  | { type: 'ADD_PROCESS_FROM_API'; process: Process }
  | { type: 'REPLACE_PROCESS'; process: Process }
  | { type: 'ADD_JOURNAL'; formData: FormData }
  | { type: 'ADD_JOURNAL_FROM_API'; entry: JournalEntry }
  | { type: 'UPDATE_JOURNAL'; id: number; data: Partial<JournalEntry> }
  | { type: 'REPLACE_JOURNAL_ENTRY'; entry: JournalEntry }
  | { type: 'SET_RKN_NOTIFICATIONS'; items: RknNotification[] }
  | { type: 'MARK_READ'; id: number }
  | { type: 'ADD_MONITOR'; data: { companyId: number; eventDate?: string; eventType: string; oldValue?: string; newValue?: string } }
  | { type: 'ADD_MONITOR_FROM_API'; event: MonitorEvent }
  | { type: 'SYNC_COMPANY_DADATA'; id: number; query?: string }
  | { type: 'PREPEND_MONITOR_EVENTS'; events: MonitorEvent[] }
  | { type: 'PATCH_COMPANIES'; companies: Company[] }
  | { type: 'ADD_COMPANY_DADATA'; query: string }
  | { type: 'ADD_COMPANY_FROM_API'; company: Company; rknNotification: RknNotification }
  | { type: 'DELETE_COMPANY'; id: number }
  | { type: 'REMOVE_COMPANY'; id: number }
  | { type: 'ADD_DOCUMENT'; formData: FormData }
  | { type: 'ADD_DOCUMENT_FROM_API'; document: Document }
  | { type: 'DELETE_DOCUMENT'; id: number }
  | { type: 'REMOVE_DOCUMENT'; id: number }
  | { type: 'SAVE_PROCESS_SECTION'; processId: number; section: number; status: string; data: SectionData };

export type DispatchFn = (action: AppAction) => void | Promise<void>;
