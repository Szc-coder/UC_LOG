interface BloodOption {
  value: string;
  label: string;
  description: string;
  color: string;
}

const bloodOptions: BloodOption[] = [
  {
    value: 'none',
    label: '无',
    description: '无可见血液',
    color: 'bg-green-100 border-green-300 text-green-700',
  },
  {
    value: 'trace',
    label: '微量',
    description: '便纸擦拭可见',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  },
  {
    value: 'coin_size',
    label: '硬币大小',
    description: '便表面带血',
    color: 'bg-orange-100 border-orange-300 text-orange-700',
  },
  {
    value: 'moderate',
    label: '明显',
    description: '便中混血',
    color: 'bg-red-100 border-red-300 text-red-700',
  },
  {
    value: 'heavy',
    label: '大量',
    description: '纯血便',
    color: 'bg-red-200 border-red-400 text-red-800',
  },
];

interface BloodAmountSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
}

export function BloodAmountSelector({
  value,
  onChange,
  label = '便血量',
}: BloodAmountSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-500">
        {label}
      </label>
      <div className="grid grid-cols-5 gap-2">
        {bloodOptions.map((option) => (
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
