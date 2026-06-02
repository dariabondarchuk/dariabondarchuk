import { Tag } from 'antd';
import { STATUS_MAP, TAG_COLOR_MAP } from '../constants';

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: 'default' };
  const color = TAG_COLOR_MAP[s.color] || 'default';
  return <Tag color={color}>{s.label}</Tag>;
}
