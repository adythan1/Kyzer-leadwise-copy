// src/components/dashboard/DashboardStatsGrid.jsx
import { BookOpen, Clock, Trophy, TrendingUp } from "lucide-react";
import MetricTile from "@/components/ui/MetricTile";

const METRICS = [
  {
    id: "enrolled",
    title: "Enrolled Courses",
    variant: "blue",
    icon: BookOpen,
    formatValue: (stats) => stats.totalEnrolled,
  },
  {
    id: "completed",
    title: "Completed",
    variant: "green",
    icon: Trophy,
    formatValue: (stats) => stats.completed,
  },
  {
    id: "inProgress",
    title: "In Progress",
    variant: "orange",
    icon: Clock,
    formatValue: (stats) => stats.inProgress,
  },
  {
    id: "average",
    title: "Average Progress",
    variant: "purple",
    icon: TrendingUp,
    formatValue: (stats) => `${stats.averageProgress}%`,
  },
];

/**
 * @param {object} props
 * @param {{ totalEnrolled: number, completed: number, inProgress: number, averageProgress: number }} props.stats
 */
export default function DashboardStatsGrid({ stats }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {METRICS.map(({ id, title, variant, icon: Icon, formatValue }) => (
        <MetricTile
          key={id}
          title={title}
          value={formatValue(stats)}
          variant={variant}
          icon={Icon}
        />
      ))}
    </div>
  );
}
