import { useState, useEffect, useMemo } from "react";
import { TrendingUp, Calendar, BarChart } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/lib/supabase";

export default function ProgressChart() {
  const { user } = useAuth();
  const [timeFrame, setTimeFrame] = useState("7d");
  const [lessonProgress, setLessonProgress] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [progressRes, enrollRes] = await Promise.all([
          supabase
            .from("lesson_progress")
            .select("time_spent_seconds, completed, last_activity_at")
            .eq("user_id", user.id),
          supabase
            .from("course_enrollments")
            .select("completed_at, status")
            .eq("user_id", user.id),
        ]);

        setLessonProgress(progressRes.data || []);
        setEnrollments(enrollRes.data || []);
      } catch {
        setLessonProgress([]);
        setEnrollments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const chartData = useMemo(() => {
    const now = new Date();

    if (timeFrame === "7d") {
      const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        return d;
      });

      const labels = last7.map((d) => weekDays[d.getDay()]);
      const learningHours = last7.map((date) => {
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const seconds = lessonProgress
          .filter((p) => {
            const a = new Date(p.last_activity_at);
            return a >= dayStart && a < dayEnd;
          })
          .reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
        return Math.round((seconds / 3600) * 10) / 10;
      });
      const coursesCompleted = last7.map((date) => {
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        return enrollments.filter((e) => {
          if (!e.completed_at) return false;
          const c = new Date(e.completed_at);
          return c >= dayStart && c < dayEnd;
        }).length;
      });
      const totalHours = Math.round(learningHours.reduce((a, b) => a + b, 0) * 10) / 10;
      const avgDaily = Math.round((totalHours / 7) * 10) / 10;

      return { labels, learningHours, coursesCompleted, totalHours, avgDaily };
    }

    if (timeFrame === "30d") {
      const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const weeks = labels.map((_, i) => {
        const end = new Date(now);
        end.setDate(end.getDate() - (3 - i) * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 7);
        return { start, end };
      });

      const learningHours = weeks.map(({ start, end }) => {
        const seconds = lessonProgress
          .filter((p) => {
            const a = new Date(p.last_activity_at);
            return a >= start && a < end;
          })
          .reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
        return Math.round(seconds / 3600);
      });
      const coursesCompleted = weeks.map(({ start, end }) =>
        enrollments.filter((e) => {
          if (!e.completed_at) return false;
          const c = new Date(e.completed_at);
          return c >= start && c < end;
        }).length
      );
      const totalHours = learningHours.reduce((a, b) => a + b, 0);
      const avgDaily = Math.round((totalHours / 30) * 10) / 10;

      return { labels, learningHours, coursesCompleted, totalHours, avgDaily };
    }

    // 90d
    const labels = ["Month 1", "Month 2", "Month 3"];
    const months = labels.map((_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (2 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start, end };
    });

    const learningHours = months.map(({ start, end }) => {
      const seconds = lessonProgress
        .filter((p) => {
          const a = new Date(p.last_activity_at);
          return a >= start && a <= end;
        })
        .reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);
      return Math.round(seconds / 3600);
    });
    const coursesCompleted = months.map(({ start, end }) =>
      enrollments.filter((e) => {
        if (!e.completed_at) return false;
        const c = new Date(e.completed_at);
        return c >= start && c <= end;
      }).length
    );
    const totalHours = learningHours.reduce((a, b) => a + b, 0);
    const avgDaily = Math.round((totalHours / 90) * 10) / 10;

    return { labels, learningHours, coursesCompleted, totalHours, avgDaily };
  }, [timeFrame, lessonProgress, enrollments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-background-medium rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-background-medium rounded"></div>
            <div className="h-16 bg-background-medium rounded"></div>
            <div className="h-16 bg-background-medium rounded"></div>
          </div>
          <div className="h-40 bg-background-medium rounded"></div>
        </div>
      </div>
    );
  }

  if (!chartData.labels.length || chartData.totalHours === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-dark">Learning Progress</h3>
            <p className="text-sm text-text-light">Track your learning activity over time</p>
          </div>
        </div>
        <div className="bg-background-light rounded-lg p-8 text-center">
          <div className="text-text-light text-lg mb-2">No learning data available yet</div>
          <div className="text-text-light text-sm">Start learning to see your progress here</div>
        </div>
      </div>
    );
  }

  const maxHours = Math.max(...chartData.learningHours, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-dark">Learning Progress</h3>
          <p className="text-sm text-text-light">Track your learning activity over time</p>
        </div>
        <div className="flex items-center space-x-2">
          {["7d", "30d", "90d"].map((period) => (
            <button
              key={period}
              onClick={() => setTimeFrame(period)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeFrame === period
                  ? "bg-primary text-white"
                  : "bg-background-medium text-text-light hover:bg-background-dark"
              }`}
            >
              {period === "7d" ? "Week" : period === "30d" ? "Month" : "Quarter"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-background-light rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-text-light">Total Hours</span>
          </div>
          <p className="text-lg font-bold text-text-dark">{chartData.totalHours}h</p>
        </div>
        <div className="bg-background-light rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <BarChart className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-text-light">Daily Avg</span>
          </div>
          <p className="text-lg font-bold text-text-dark">{chartData.avgDaily}h</p>
        </div>
        <div className="bg-background-light rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-text-light">Completed</span>
          </div>
          <p className="text-lg font-bold text-text-dark">
            {chartData.coursesCompleted.reduce((a, b) => a + b, 0)}
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-end justify-between space-x-2 h-40 px-2">
          {chartData.labels.map((label, index) => {
            const hours = chartData.learningHours[index] || 0;
            const completed = chartData.coursesCompleted[index] || 0;
            const heightPercentage = maxHours > 0 ? (hours / maxHours) * 100 : 0;

            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col justify-end h-32 mb-2">
                  <div
                    className="w-full bg-primary rounded-t-sm transition-all duration-300 hover:bg-primary-dark cursor-pointer group relative"
                    style={{ height: `${heightPercentage}%`, minHeight: hours > 0 ? "4px" : "0" }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-text-dark text-white text-xs rounded whitespace-nowrap transition-opacity z-10">
                      {hours}h learning{completed > 0 && `, ${completed} completed`}
                    </div>
                  </div>
                  {completed > 0 && <div className="w-full h-1 bg-green-500 rounded-b-sm"></div>}
                </div>
                <span className="text-xs text-text-light font-medium">{label}</span>
              </div>
            );
          })}
        </div>
        <div className="absolute left-0 top-0 h-32 flex flex-col justify-between text-xs text-text-light">
          <span>{maxHours}h</span>
          <span>{Math.round(maxHours / 2)}h</span>
          <span>0h</span>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary rounded"></div>
          <span className="text-text-light">Learning Hours</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-text-light">Courses Completed</span>
        </div>
      </div>
    </div>
  );
}
