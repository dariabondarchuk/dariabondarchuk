export interface SectionData {
  description?: string;
  contactName?: string;
  contactPosition?: string;
  contactEmail?: string;
  macroGoal?: string;
  goal?: string;
  persons?: string;
  count?: string;
  hasIncapable?: boolean;
  sources?: string[];
  pdCategories?: string[];
  specialCategories?: boolean;
  biometric?: boolean;
  consentRequired?: boolean;
  legalBasis?: string;
  actions?: string[];
  retentionPeriod?: string;
  thirdParties?: string[];
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
  | { type: 'ADD_JOURNAL'; entry?: Partial<JournalEntry>; formData?: FormData }
  | { type: 'ADD_JOURNAL_FROM_API'; entry: JournalEntry }
  | { type: 'UPDATE_JOURNAL'; id: number; data: Partial<JournalEntry> }
  | { type: 'MARK_READ'; id: number }
  | { type: 'SAVE_PROCESS_SECTION'; processId: number; section: number; status: string; data: SectionData };

export type DispatchFn = (action: AppAction) => void | Promise<void>;
