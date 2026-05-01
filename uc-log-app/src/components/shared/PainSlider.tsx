type SliderMode = 'pain' | 'urgency' | 'fatigue' | 'wellbeing' | 'severity';

interface PainSliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  mode?: SliderMode;
  lowLabel?: string;
  highLabel?: string;
}

const modeLabels: Record<SliderMode, { labels: Record<number, string>; lowText: string; highText: string }> = {
  pain: {
    labels: { 0: '无', 1: '几乎无', 2: '轻微', 3: '轻度', 4: '轻中度', 5: '中度', 6: '中重度', 7: '明显', 8: '重度', 9: '剧烈', 10: '剧痛' },
    lowText: '无痛',
    highText: '剧痛',
  },
  urgency: {
    labels: { 0: '无', 1: '极轻微', 2: '轻微', 3: '有点急', 4: '较急', 5: '中等', 6: '较强烈', 7: '强烈', 8: '很强烈', 9: '非常强烈', 10: '无法忍耐' },
    lowText: '无急迫',
    highText: '无法忍耐',
  },
  fatigue: {
    labels: { 0: '精力充沛', 1: '极轻微', 2: '轻微', 3: '有点累', 4: '较累', 5: '中等疲劳', 6: '较疲劳', 7: '明显疲劳', 8: '很疲劳', 9: '极度疲劳', 10: '精疲力竭' },
    lowText: '精力充沛',
    highText: '精疲力竭',
  },
  wellbeing: {
    labels: { 0: '极差', 1: '很差', 2: '差', 3: '较差', 4: '稍差', 5: '一般', 6: '还行', 7: '较好', 8: '良好', 9: '很好', 10: '极好' },
    lowText: '极差',
    highText: '极好',
  },
  severity: {
    labels: { 0: '无', 1: '极轻微', 2: '轻微', 3: '轻度', 4: '轻中度', 5: '中度', 6: '中重度', 7: '明显', 8: '重度', 9: '严重', 10: '极严重' },
    lowText: '无',
    highText: '极严重',
  },
};

export function PainSlider({
  value,
  onChange,
  label = '疼痛程度',
  min = 0,
  max = 10,
  mode = 'pain',
  lowLabel,
  highLabel,
}: PainSliderProps) {
  const modeConfig = modeLabels[mode];

  const getColor = (level: number) => {
    if (mode === 'wellbeing') {
      // Reversed: higher is better
      if (level >= 8) return 'text-green-600';
      if (level >= 6) return 'text-lime-600';
      if (level >= 4) return 'text-yellow-600';
      if (level >= 2) return 'text-orange-500';
      return 'text-red-600';
    }
    // Normal: lower is better
    if (level <= 2) return 'text-green-600';
    if (level <= 4) return 'text-yellow-600';
    if (level <= 6) return 'text-orange-500';
    if (level <= 8) return 'text-red-500';
    return 'text-red-700';
  };

  const getBg = (level: number) => {
    if (mode === 'wellbeing') {
      if (level >= 8) return 'bg-green-500';
      if (level >= 6) return 'bg-lime-500';
      if (level >= 4) return 'bg-yellow-500';
      if (level >= 2) return 'bg-orange-500';
      return 'bg-red-500';
    }
    if (level <= 2) return 'bg-green-500';
    if (level <= 4) return 'bg-yellow-500';
    if (level <= 6) return 'bg-orange-500';
    if (level <= 8) return 'bg-red-500';
    return 'bg-red-700';
  };

  const getGradient = () => {
    if (mode === 'wellbeing') {
      return 'bg-gradient-to-r from-red-500 via-yellow-400 to-green-500';
    }
    return 'bg-gradient-to-r from-green-400 via-yellow-400 to-red-600';
  };

  const currentLabel = modeConfig.labels[value] || `${value}`;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        <span className={`text-sm font-semibold ${getColor(value)}`}>
          {value}/10 · {currentLabel}
        </span>
      </div>

      {/* 滑块 */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={`w-full h-2 rounded-full appearance-none cursor-pointer
            ${getGradient()}
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-gray-300
            [&::-webkit-slider-thumb]:cursor-pointer
          `}
        />
      </div>

      {/* 左右标签 */}
      <div className="flex justify-between px-1">
        <span className="text-[10px] text-gray-400">{lowLabel || modeConfig.lowText}</span>
        <span className="text-[10px] text-gray-400">{highLabel || modeConfig.highText}</span>
      </div>

      {/* 刻度按钮 */}
      <div className="flex justify-between px-0.5">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`
              w-6 h-6 rounded-full text-[10px] font-medium transition-all outline-none
              ${value === i
                ? `${getBg(i)} text-white shadow-sm`
                : 'text-gray-400 hover:text-gray-600 hover:bg-white/40'
              }
            `}
          >
            {i}
          </button>
        ))}
      </div>

      {/* 当前选中描述 */}
      <div className={`text-center text-xs font-medium ${getColor(value)} py-1 px-3 rounded-lg bg-white/40`}>
        {currentLabel}
      </div>
    </div>
  );
}
