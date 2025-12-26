import * as Flags from 'country-flag-icons/react/3x2';

interface CountryFlagProps {
  countryCode: string;
  className?: string;
}

// Map of country codes to flag components
const flagMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  USA: Flags.US,
  EUR: Flags.EU,
  DEU: Flags.DE,
  FRA: Flags.FR,
  ESP: Flags.ES,
  GBR: Flags.GB,
  CHN: Flags.CN,
  JPN: Flags.JP,
};

export function CountryFlag({ countryCode, className = "w-6 h-4" }: CountryFlagProps) {
  const FlagComponent = flagMap[countryCode];
  
  if (!FlagComponent) {
    return <span className={className}>🏳️</span>;
  }
  
  return <FlagComponent className={className} />;
}
