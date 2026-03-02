"use client";
function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    green: "text-green-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
    cyan: "text-cyan-400",
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-gray-700 hover:border-gray-500 transition transform hover:-translate-y-1 hover:shadow-xl">
      <p className="text-gray-400 mb-2">{title}</p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>
        {value}
      </p>
    </div>
  );
}

export default StatCard;