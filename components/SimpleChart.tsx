"use client";

type ChartData = {
  label: string;
  value: number;
  color?: string;
};

type SimpleChartProps = {
  data: ChartData[];
  title?: string;
  type?: "bar" | "line";
  height?: number;
};

export default function SimpleChart({
  data,
  title,
  type = "bar",
  height = 200,
}: SimpleChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No data available</div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 0);

  if (type === "bar") {
    return (
      <div className="p-4">
        {title && <h3 className="font-bold mb-4">{title}</h3>}
        <div className="space-y-2">
          {data.map((item, idx) => {
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const color = item.color || `hsl(${(idx * 60) % 360}, 70%, 50%)`;
            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium truncate">
                  {item.label}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color,
                    }}
                  >
                    {percentage > 10 && (
                      <span className="text-white text-xs font-bold">
                        {item.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                {percentage <= 10 && (
                  <div className="w-20 text-right text-sm font-bold">
                    {item.value.toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Line chart
  const points = data.map((item, idx) => {
    const x = (idx / (data.length - 1 || 1)) * 100;
    const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 50;
    return `${x},${y}`;
  });

  return (
    <div className="p-4">
      {title && <h3 className="font-bold mb-4">{title}</h3>}
      <svg width="100%" height={height} className="border rounded">
        <polyline
          fill="none"
          stroke="blue"
          strokeWidth="2"
          points={points.join(" ")}
        />
        {data.map((item, idx) => {
          const x = (idx / (data.length - 1 || 1)) * 100;
          const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 50;
          return (
            <g key={idx}>
              <circle cx={`${x}%`} cy={`${y}%`} r="4" fill="blue" />
              <text
                x={`${x}%`}
                y="95%"
                textAnchor="middle"
                fontSize="10"
                fill="gray"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
