import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, addDays } from 'date-fns';

// Detectamos la zona horaria del navegador del cliente
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const getCalendarDateRange = (filterType: string) => {
  const now = new Date(); // Fecha y hora del navegador del cliente
  let startDate, endDate;

  // Lógica de Fechas Relativas al CLIENTE
  switch (filterType) {
    case 'yesterday':
      const yesterday = subDays(now, 1);
      startDate = new Date(yesterday);
      endDate = new Date(yesterday);
      break;
    case 'today':
      startDate = new Date(now);
      endDate = new Date(now);
      break;
    case 'tomorrow':
      const tomorrow = addDays(now, 1);
      startDate = new Date(tomorrow);
      endDate = new Date(tomorrow);
      break;
    case 'thisWeek':
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // Lunes
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'nextWeek':
      const nextWeek = addDays(now, 7);
      startDate = startOfWeek(nextWeek, { weekStartsOn: 1 });
      endDate = endOfWeek(nextWeek, { weekStartsOn: 1 });
      break;
    case 'thisMonth':
      // Aquí está la magia: Si pasamos a Enero, 'now' será Enero y pedirá Enero.
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    default:
      startDate = new Date(now);
      endDate = new Date(now);
  }

  // Convertimos a ISO String para enviar al Backend
  // Importante: setear horas inicio (00:00) y fin (23:59)
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return {
    from: startDate.toISOString(),
    to: endDate.toISOString(),
    clientTimezone: userTimezone
  };
};
