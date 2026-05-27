import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a');
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy');
}

export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'hh:mm a');
}

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function isTodayDate(dateStr: string): boolean {
  return isToday(new Date(dateStr));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getVisitorTypeLabel(type: string): string {
  switch (type) {
    case 'courier': return 'Courier';
    case 'delivery_agent': return 'Delivery Agent';
    case 'visitor': return 'Visitor';
    default: return type;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'checked_in': return 'bg-green-100 text-green-800';
    case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
    case 'checked_out': return 'bg-gray-100 text-gray-800';
    default: return 'bg-blue-100 text-blue-800';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'checked_in': return 'Checked In';
    case 'pending_approval': return 'Pending Approval';
    case 'checked_out': return 'Checked Out';
    default: return status;
  }
}

export function getVisitorTypeColor(type: string): string {
  switch (type) {
    case 'courier': return 'bg-purple-100 text-purple-800';
    case 'delivery_agent': return 'bg-blue-100 text-blue-800';
    case 'visitor': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
