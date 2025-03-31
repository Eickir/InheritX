// CircularProgress.jsx
export default function CircularProgress({ percentage }) {
    const radius = 40;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return (
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#3b82f6"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.35s",
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-sm font-bold fill-current text-gray-800"
        >
          {percentage}%
        </text>
      </svg>
    );
  }
  