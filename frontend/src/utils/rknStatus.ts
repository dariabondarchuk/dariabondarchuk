import type { RknNotification } from '../types';

export type RknDisplayStatus = 'submitted' | 'not_submitted';

export function getRknDisplayStatus(record: RknNotification): RknDisplayStatus {
  return record.files.length > 0 ? 'submitted' : 'not_submitted';
}
