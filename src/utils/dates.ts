import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const localDay = (date = new Date()) => format(date, 'yyyy-MM-dd');
export const dayLabel = (day: string) =>
  format(parseISO(day), "EEEE, dd 'de' MMMM", { locale: ptBR });
export const recentDays = (day: string, count: number) =>
  Array.from({ length: count }, (_, index) => localDay(subDays(parseISO(day), count - index - 1)));
export const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value);
