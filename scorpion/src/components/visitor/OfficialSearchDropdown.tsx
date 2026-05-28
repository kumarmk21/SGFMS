import React, { useState, useMemo } from 'react';
import { Search, User, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useOfficials } from '@/hooks/useProfiles';
import type { Profile } from '@/types';
import { cn, getInitials } from '@/lib/utils';

interface OfficialSearchDropdownProps {
  value: string;
  onChange: (official: Profile | null) => void;
  placeholder?: string;
}

export default function OfficialSearchDropdown({ value, onChange, placeholder = 'Search company officials...' }: OfficialSearchDropdownProps) {
  const { data: officials } = useOfficials();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const selected = officials?.find(o => o.id === value);

  const filtered = useMemo(() => {
    if (!officials) return [];
    const q = search.toLowerCase();
    return officials.filter(o =>
      o.full_name.toLowerCase().includes(q) ||
      (o.department ?? '').toLowerCase().includes(q) ||
      (o.designation ?? '').toLowerCase().includes(q)
    );
  }, [officials, search]);

  const unavailable = filtered.filter(o => !o.is_available);
  const available = filtered.filter(o => o.is_available);

  const handleSelect = (official: Profile) => {
    onChange(official);
    setSearch('');
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center justify-between p-3 border rounded-md bg-background">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {getInitials(selected.full_name)}
            </div>
            <div>
              <p className="text-sm font-medium">{selected.full_name}</p>
              <p className="text-xs text-muted-foreground">{selected.designation} · {selected.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={selected.is_available ? 'success' : 'warning'} className="text-xs">
              {selected.is_available ? 'Available' : 'Unavailable'}
            </Badge>
            <button onClick={handleClear} className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2">
              Change
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="pl-9"
          />
        </div>
      )}

      {open && !selected && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <User className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No officials found
              </div>
            ) : (
              <>
                {available.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-gray-50">
                      Available
                    </div>
                    {available.map(official => (
                      <OfficialItem key={official.id} official={official} onSelect={handleSelect} />
                    ))}
                  </div>
                )}
                {unavailable.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-gray-50 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-yellow-500" />
                      Unavailable — consider alternatives
                    </div>
                    {unavailable.map(official => (
                      <OfficialItem key={official.id} official={official} onSelect={handleSelect} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {selected && !selected.is_available && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>{selected.full_name}</strong> is currently unavailable. Consider selecting an alternative official or department head.
          </span>
        </div>
      )}
    </div>
  );
}

function OfficialItem({ official, onSelect }: { official: Profile; onSelect: (o: Profile) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(official)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors',
        !official.is_available && 'opacity-70'
      )}
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
        {getInitials(official.full_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{official.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{official.designation} · {official.department}</p>
      </div>
      <Badge variant={official.is_available ? 'success' : 'outline'} className="text-xs shrink-0">
        {official.is_available ? '●' : '○'}
      </Badge>
    </button>
  );
}
