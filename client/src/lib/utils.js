import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function toIST(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString + 'Z');
  return d.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
}

export function toISTFull(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString + 'Z');
  return d.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata', 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
}

