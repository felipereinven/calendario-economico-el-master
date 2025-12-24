import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";

interface TimezoneSelectorProps {
  selectedTimezone: string;
  onTimezoneChange: (timezone: string) => void;
}

// Lista completa de zonas horarias principales organizadas por región
const timezonesByRegion = {
  "América del Norte": [
    { value: "America/New_York", label: "Nueva York (EST/EDT)", offset: "UTC-5/-4" },
    { value: "America/Chicago", label: "Chicago (CST/CDT)", offset: "UTC-6/-5" },
    { value: "America/Denver", label: "Denver (MST/MDT)", offset: "UTC-7/-6" },
    { value: "America/Los_Angeles", label: "Los Ángeles (PST/PDT)", offset: "UTC-8/-7" },
    { value: "America/Anchorage", label: "Anchorage (AKST/AKDT)", offset: "UTC-9/-8" },
    { value: "America/Phoenix", label: "Phoenix (MST)", offset: "UTC-7" },
    { value: "America/Toronto", label: "Toronto (EST/EDT)", offset: "UTC-5/-4" },
    { value: "America/Vancouver", label: "Vancouver (PST/PDT)", offset: "UTC-8/-7" },
    { value: "America/Mexico_City", label: "Ciudad de México (CST)", offset: "UTC-6" },
  ],
  "América Central y Caribe": [
    { value: "America/Havana", label: "La Habana (CST/CDT)", offset: "UTC-5/-4" },
    { value: "America/Panama", label: "Panamá (EST)", offset: "UTC-5" },
    { value: "America/Costa_Rica", label: "Costa Rica (CST)", offset: "UTC-6" },
    { value: "America/Guatemala", label: "Guatemala (CST)", offset: "UTC-6" },
    { value: "America/El_Salvador", label: "El Salvador (CST)", offset: "UTC-6" },
  ],
  "América del Sur": [
    { value: "America/Bogota", label: "Bogotá (COT)", offset: "UTC-5" },
    { value: "America/Lima", label: "Lima (PET)", offset: "UTC-5" },
    { value: "America/Caracas", label: "Caracas (VET)", offset: "UTC-4" },
    { value: "America/Santiago", label: "Santiago (CLT/CLST)", offset: "UTC-4/-3" },
    { value: "America/Buenos_Aires", label: "Buenos Aires (ART)", offset: "UTC-3" },
    { value: "America/Sao_Paulo", label: "São Paulo (BRT)", offset: "UTC-3" },
    { value: "America/Montevideo", label: "Montevideo (UYT)", offset: "UTC-3" },
    { value: "America/Guayaquil", label: "Guayaquil (ECT)", offset: "UTC-5" },
    { value: "America/La_Paz", label: "La Paz (BOT)", offset: "UTC-4" },
  ],
  "Europa": [
    { value: "Europe/London", label: "Londres (GMT/BST)", offset: "UTC+0/+1" },
    { value: "Europe/Paris", label: "París (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Berlin", label: "Berlín (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Madrid", label: "Madrid (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Rome", label: "Roma (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Amsterdam", label: "Ámsterdam (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Brussels", label: "Bruselas (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Zurich", label: "Zúrich (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Vienna", label: "Viena (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Warsaw", label: "Varsovia (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Prague", label: "Praga (CET/CEST)", offset: "UTC+1/+2" },
    { value: "Europe/Athens", label: "Atenas (EET/EEST)", offset: "UTC+2/+3" },
    { value: "Europe/Istanbul", label: "Estambul (TRT)", offset: "UTC+3" },
    { value: "Europe/Moscow", label: "Moscú (MSK)", offset: "UTC+3" },
    { value: "Europe/Lisbon", label: "Lisboa (WET/WEST)", offset: "UTC+0/+1" },
    { value: "Europe/Dublin", label: "Dublín (GMT/IST)", offset: "UTC+0/+1" },
  ],
  "Asia": [
    { value: "Asia/Dubai", label: "Dubái (GST)", offset: "UTC+4" },
    { value: "Asia/Karachi", label: "Karachi (PKT)", offset: "UTC+5" },
    { value: "Asia/Kolkata", label: "Kolkata (IST)", offset: "UTC+5:30" },
    { value: "Asia/Bangkok", label: "Bangkok (ICT)", offset: "UTC+7" },
    { value: "Asia/Singapore", label: "Singapur (SGT)", offset: "UTC+8" },
    { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", offset: "UTC+8" },
    { value: "Asia/Shanghai", label: "Shanghái (CST)", offset: "UTC+8" },
    { value: "Asia/Tokyo", label: "Tokio (JST)", offset: "UTC+9" },
    { value: "Asia/Seoul", label: "Seúl (KST)", offset: "UTC+9" },
    { value: "Asia/Jakarta", label: "Yakarta (WIB)", offset: "UTC+7" },
    { value: "Asia/Manila", label: "Manila (PHT)", offset: "UTC+8" },
    { value: "Asia/Taipei", label: "Taipéi (CST)", offset: "UTC+8" },
    { value: "Asia/Jerusalem", label: "Jerusalén (IST)", offset: "UTC+2/+3" },
    { value: "Asia/Riyadh", label: "Riad (AST)", offset: "UTC+3" },
  ],
  "Oceanía": [
    { value: "Australia/Sydney", label: "Sídney (AEST/AEDT)", offset: "UTC+10/+11" },
    { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)", offset: "UTC+10/+11" },
    { value: "Australia/Brisbane", label: "Brisbane (AEST)", offset: "UTC+10" },
    { value: "Australia/Perth", label: "Perth (AWST)", offset: "UTC+8" },
    { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)", offset: "UTC+12/+13" },
    { value: "Pacific/Fiji", label: "Fiyi (FJT)", offset: "UTC+12" },
  ],
  "África": [
    { value: "Africa/Cairo", label: "El Cairo (EET)", offset: "UTC+2" },
    { value: "Africa/Johannesburg", label: "Johannesburgo (SAST)", offset: "UTC+2" },
    { value: "Africa/Lagos", label: "Lagos (WAT)", offset: "UTC+1" },
    { value: "Africa/Nairobi", label: "Nairobi (EAT)", offset: "UTC+3" },
    { value: "Africa/Casablanca", label: "Casablanca (WET)", offset: "UTC+0/+1" },
  ],
  "Otros": [
    { value: "UTC", label: "UTC (Tiempo Universal Coordinado)", offset: "UTC+0" },
    { value: "Pacific/Honolulu", label: "Honolulu (HST)", offset: "UTC-10" },
  ],
};

// Aplanar todas las zonas horarias para búsqueda
const allTimezones = Object.values(timezonesByRegion).flat();

export function TimezoneSelector({
  selectedTimezone,
  onTimezoneChange,
}: TimezoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tempTimezone, setTempTimezone] = useState(selectedTimezone);

  const handleApply = () => {
    onTimezoneChange(tempTimezone);
    setOpen(false);
  };

  const selectedLabel = allTimezones.find((tz) => tz.value === selectedTimezone)?.label || selectedTimezone;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50"
          data-testid="button-timezone-toggle"
        >
          <Clock className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seleccionar Zona Horaria</DialogTitle>
          <DialogDescription>
            Elige tu zona horaria para ver los eventos en tu hora local
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="timezone-select" className="text-sm font-medium text-foreground" data-testid="text-current-timezone">
              Zona horaria actual: <span className="text-muted-foreground">{selectedLabel}</span>
            </label>
            <Select value={tempTimezone} onValueChange={setTempTimezone}>
              <SelectTrigger id="timezone-select" data-testid="select-timezone">
                <SelectValue placeholder="Seleccionar zona horaria" />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {Object.entries(timezonesByRegion).map(([region, timezones]) => (
                  <div key={region}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {region}
                    </div>
                    {timezones.map((tz) => (
                      <SelectItem 
                        key={tz.value} 
                        value={tz.value} 
                        data-testid={`option-timezone-${tz.value}`}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{tz.label}</span>
                          <span className="text-xs text-muted-foreground font-mono">{tz.offset}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-timezone-cancel">
              Cancelar
            </Button>
            <Button onClick={handleApply} data-testid="button-timezone-apply">
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
