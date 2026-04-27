import { TAX_RULES } from '@/logic/tax/calculator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap } from 'lucide-react';

const TAX_CATEGORY_EMOJI = {
  'PPN': '🧾',
  'PPh': '📋',
  'Tidak Kena Pajak': '✅',
};

export default function TaxTypeSelector({ value, onChange, label = 'Jenis Pajak' }) {
  const grouped = {};
  Object.entries(TAX_RULES).forEach(([code, rule]) => {
    if (!grouped[rule.category]) grouped[rule.category] = [];
    grouped[rule.category].push({ code, ...rule });
  });

  const selectedRule = TAX_RULES[value];

  return (
    <div>
      {label && <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1 block">
        <Zap className="w-3 h-3 text-primary" /> {label}
      </label>}
      <Select value={value || 'NONE'} onValueChange={onChange}>
        <SelectTrigger className="bg-secondary border-border text-sm">
          <SelectValue>
            {selectedRule ? (
              <span className="flex items-center gap-2">
                <span>{TAX_CATEGORY_EMOJI[selectedRule.category]}</span>
                <span>{selectedRule.label}</span>
                {selectedRule.rate > 0 && (
                  <span className="text-xs text-primary ml-auto">
                    {(selectedRule.rate * 100).toFixed(1)}%
                  </span>
                )}
              </span>
            ) : 'Pilih jenis pajak...'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {Object.entries(grouped).map(([category, rules]) => (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {TAX_CATEGORY_EMOJI[category]} {category}
              </div>
              {rules.map(rule => (
                <SelectItem key={rule.code} value={rule.code} className="pl-4">
                  <div className="flex items-center gap-2">
                    <span className="flex-1">{rule.label}</span>
                    {rule.rate > 0 && (
                      <span className="text-xs text-primary">{(rule.rate * 100).toFixed(1)}%</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
