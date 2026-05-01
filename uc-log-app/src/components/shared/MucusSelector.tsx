interface MucusOption {
  value: string;
  label: string;
  description: string;
  color: string;
}

const mucusOptions: MucusOption[] = [
  {
    value: 'none',
    label: '无',
    description: '无可见黏液',
    color: 'bg-green-100 border-green-300 text-green-700',
  },
  {
    value: 'small',
    label: '少量',
    description: '便表面可见',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  },
  {
    value: 'moderate',
    label: '中等',
    description: '便中混有',
    color: 'bg-orange-100 border-orange-300 text-orange-700',
  },
  {
    value: 'large',
    label: '大量',
    description: '单独排出',
    color: 'bg-red-100 border-red-300 text-red-700',
  },
];

interface MucusSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

export function MucusSelector({ value, onChange }: MucusSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-500">
        黏液量
      </label>
      <div className="grid grid-cols-4 gap-2">
        {mucusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              p-2 rounded-xl border-2 transition-all duration-150 outline-none text-center
              ${value === option.value
                ? `${option.color} border-current shadow-sm`
                : 'bg-white/40 border-white/60 hover:bg-white/60'
              }
            `}
          >
            <div className="text-[11px] font-semibold">{option.label}</div>
            <div className="text-[9px] text-gray-500 mt-0.5">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
