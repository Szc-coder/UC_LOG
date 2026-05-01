interface BristolType {
  type: number;
  label: string;
  description: string;
  emoji: string;
  color: string;
}

const bristolTypes: BristolType[] = [
  {
    type: 1,
    label: '1型',
    description: '坚果状硬球',
    emoji: '🔴',
    color: 'bg-red-100 border-red-300 text-red-700',
  },
  {
    type: 2,
    label: '2型',
    description: '香肠状但成块',
    emoji: '🟠',
    color: 'bg-orange-100 border-orange-300 text-orange-700',
  },
  {
    type: 3,
    label: '3型',
    description: '香肠状有裂痕',
    emoji: '🟡',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  },
  {
    type: 4,
    label: '4型',
    description: '光滑软条',
    emoji: '🟢',
    color: 'bg-green-100 border-green-300 text-green-700',
  },
  {
    type: 5,
    label: '5型',
    description: '软块边缘清',
    emoji: '🟢',
    color: 'bg-green-100 border-green-300 text-green-700',
  },
  {
    type: 6,
    label: '6型',
    description: '糊状蓬松块',
    emoji: '🟡',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  },
  {
    type: 7,
    label: '7型',
    description: '水样无固体',
    emoji: '🔴',
    color: 'bg-red-100 border-red-300 text-red-700',
  },
];

interface BristolSelectorProps {
  value: number | null;
  onChange: (type: number) => void;
}

export function BristolSelector({ value, onChange }: BristolSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-500">
        Bristol 大便性状量表
      </label>
      <div className="grid grid-cols-7 gap-2">
        {bristolTypes.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onChange(item.type)}
            className={`
              relative p-2 rounded-xl border-2 transition-all duration-150 outline-none
              ${value === item.type
                ? `${item.color} border-current shadow-sm scale-105`
                : 'bg-white/40 border-white/60 hover:bg-white/60'
              }
            `}
          >
            <div className="text-lg mb-0.5">{item.emoji}</div>
            <div className="text-[11px] font-semibold">{item.label}</div>
            <div className="text-[9px] text-gray-500 leading-tight mt-0.5">
              {item.description}
            </div>
          </button>
        ))}
      </div>

      {/* 选中项的详细说明 */}
      {value && (
        <div className="mt-2 p-3 rounded-lg bg-white/40 border border-white/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">{bristolTypes[value - 1].emoji}</span>
            <div>
              <div className="text-sm font-medium text-gray-700">
                Bristol {value}型 - {bristolTypes[value - 1].label}
              </div>
              <div className="text-xs text-gray-500">
                {bristolTypes[value - 1].description}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
