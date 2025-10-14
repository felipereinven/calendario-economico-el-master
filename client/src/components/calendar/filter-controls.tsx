import { type FilterOptions, countries, economicCategories } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ChevronDown, TrendingUp } from "lucide-react";
import { useState } from "react";

interface FilterControlsProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
}

const impactLevels = [
  { value: "high" as const, label: "Alta", color: "bg-impact-high" },
  { value: "medium" as const, label: "Media", color: "bg-impact-medium" },
  { value: "low" as const, label: "Baja", color: "bg-impact-low" },
];

const timePeriods = [
  { value: "today" as const, label: "Hoy" },
  { value: "thisWeek" as const, label: "Esta Semana" },
  { value: "nextWeek" as const, label: "Próxima Semana" },
  { value: "thisMonth" as const, label: "Este Mes" },
];

export function FilterControls({ filters, onFilterChange }: FilterControlsProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");

  const toggleCountry = (countryCode: string) => {
    const current = filters.countries || [];
    const updated = current.includes(countryCode)
      ? current.filter((c) => c !== countryCode)
      : [...current, countryCode];
    onFilterChange({ countries: updated });
  };

  const toggleImpact = (impact: "high" | "medium" | "low") => {
    const current = filters.impacts || [];
    const updated = current.includes(impact)
      ? current.filter((i) => i !== impact)
      : [...current, impact];
    onFilterChange({ impacts: updated });
  };

  const toggleCategory = (category: string) => {
    const current = filters.categories || [];
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    onFilterChange({ categories: updated });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFilterChange({ search: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Country Filter */}
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
            País / Región
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                data-testid="dropdown-country"
              >
                <span className="truncate">
                  {filters.countries && filters.countries.length > 0
                    ? `${filters.countries.length} seleccionados`
                    : "Todos los países"}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 z-[200]" align="start">
              <DropdownMenuCheckboxItem
                checked={!filters.countries || filters.countries.length === 0}
                onCheckedChange={() => onFilterChange({ countries: [] })}
                data-testid="checkbox-country-all"
              >
                <span className="font-semibold">Todos los países</span>
              </DropdownMenuCheckboxItem>
              <div className="my-1 h-px bg-border" />
              {countries.map((country) => (
                <DropdownMenuCheckboxItem
                  key={country.code}
                  checked={filters.countries?.includes(country.code)}
                  onCheckedChange={() => toggleCountry(country.code)}
                  data-testid={`checkbox-country-${country.code}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{country.flag}</span>
                    <span className="font-mono text-xs text-muted-foreground">{country.code}</span>
                    <span>{country.name}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Category Filter */}
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
            Categoría Económica
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                data-testid="dropdown-category"
              >
                <div className="flex items-center gap-2 truncate">
                  <TrendingUp className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {filters.categories && filters.categories.length > 0
                      ? `${filters.categories.length} seleccionadas`
                      : "Todas las categorías"}
                  </span>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 z-[200]" align="start">
              <DropdownMenuCheckboxItem
                checked={!filters.categories || filters.categories.length === 0}
                onCheckedChange={() => onFilterChange({ categories: [] })}
                data-testid="checkbox-category-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <span className="font-semibold">Todas las categorías</span>
                </div>
              </DropdownMenuCheckboxItem>
              <div className="my-1 h-px bg-border" />
              {economicCategories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category.value}
                  checked={filters.categories?.includes(category.value)}
                  onCheckedChange={() => toggleCategory(category.value)}
                  data-testid={`checkbox-category-${category.value}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{category.icon}</span>
                    <span>{category.label}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
            Buscar Eventos
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por evento o país..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      {/* Impact Level Filter */}
      <div>
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          Nivel de Impacto
        </label>
        <div className="flex flex-wrap gap-2">
          {impactLevels.map((level) => (
            <Button
              key={level.value}
              variant={filters.impacts?.includes(level.value) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleImpact(level.value)}
              className="gap-2"
              data-testid={`button-impact-${level.value}`}
            >
              <span className={`w-3 h-3 rounded-full ${level.color}`} />
              {level.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Time Period Filter */}
      <div>
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
          Período de Tiempo
        </label>
        <div className="flex flex-wrap gap-2">
          {timePeriods.map((period) => (
            <Button
              key={period.value}
              variant={filters.dateRange === period.value ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange({ dateRange: period.value })}
              data-testid={`button-period-${period.value}`}
            >
              {period.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {((filters.countries && filters.countries.length > 0) ||
        (filters.impacts && filters.impacts.length > 0) ||
        (filters.categories && filters.categories.length > 0) ||
        filters.search) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filtros activos:</span>
          {filters.countries?.map((code) => {
            const country = countries.find((c) => c.code === code);
            return country ? (
              <Badge key={code} variant="secondary" className="gap-1">
                <span className="text-base">{country.flag}</span>
                {country.code}
              </Badge>
            ) : null;
          })}
          {filters.categories?.map((categoryValue) => {
            const category = economicCategories.find((c) => c.value === categoryValue);
            return category ? (
              <Badge key={categoryValue} variant="secondary" className="gap-1">
                <span>{category.icon}</span>
                {category.label}
              </Badge>
            ) : null;
          })}
          {filters.impacts?.map((impact) => {
            const level = impactLevels.find((l) => l.value === impact);
            return level ? (
              <Badge key={impact} variant="secondary" className="gap-1">
                <span className={`w-2 h-2 rounded-full ${level.color}`} />
                {level.label}
              </Badge>
            ) : null;
          })}
          {filters.search && (
            <Badge variant="secondary">
              Búsqueda: {filters.search}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
