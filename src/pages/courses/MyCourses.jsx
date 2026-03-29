// import { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
// import {
//   BookOpen,
//   Clock,
//   Play,
//   CheckCircle,
//   Award,
//   Calendar,
//   Filter,
//   Search,
//   BarChart3,
//   Target,
//   Settings,
// } from "lucide-react";
// import Button from "../../components/ui/Button";
// import LoadingSpinner from "../../components/ui/LoadingSpinner";

// const MyCourses = () => {
//   const [courses, setCourses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");

//   const statusOptions = [
//     { id: "all", name: "All Courses" },
//     { id: "in-progress", name: "In Progress" },
//     { id: "completed", name: "Completed" },
//     { id: "not-started", name: "Not Started" },
//   ];

//   useEffect(() => {
//     const loadMyCourses = async () => {
//       // Simulate API call
//       await new Promise((resolve) => setTimeout(resolve, 1000));

//       setCourses([
//         {
//           id: 1,
//           title: "Complete React Developer Course",
//           instructor: "John Smith",
//           thumbnail: "/course-placeholder.jpg",
//           progress: 75,
//           totalLessons: 120,
//           completedLessons: 90,
//           totalDuration: 40,
//           timeSpent: 30,
//           enrolledDate: "2024-01-15",
//           lastAccessed: "2024-01-20",
//           nextLesson: {
//             id: 91,
//             title: "Advanced Hooks Patterns",
//             duration: 25,
//           },
//           status: "in-progress",
//           certificate: null,
//         },
//         {
//           id: 2,
//           title: "JavaScript Fundamentals",
//           instructor: "Sarah Johnson",
//           thumbnail: "/course-placeholder.jpg",
//           progress: 100,
//           totalLessons: 80,
//           completedLessons: 80,
//           totalDuration: 25,
//           timeSpent: 25,
//           enrolledDate: "2023-12-01",
//           lastAccessed: "2024-01-10",
//           completedDate: "2024-01-10",
//           status: "completed",
//           certificate: {
//             id: "cert-001",
//             url: "/certificates/js-fundamentals.pdf",
//           },
//         },
//         {
//           id: 3,
//           title: "CSS Grid and Flexbox",
//           instructor: "Mike Chen",
//           thumbnail: "/course-placeholder.jpg",
//           progress: 30,
//           totalLessons: 60,
//           completedLessons: 18,
//           totalDuration: 20,
//           timeSpent: 6,
//           enrolledDate: "2024-01-18",
//           lastAccessed: "2024-01-19",
//           nextLesson: {
//             id: 19,
//             title: "Grid Template Areas",
//             duration: 15,
//           },
//           status: "in-progress",
//         },
//         {
//           id: 4,
//           title: "Node.js Backend Development",
//           instructor: "Alex Rodriguez",
//           thumbnail: "/course-placeholder.jpg",
//           progress: 0,
//           totalLessons: 100,
//           completedLessons: 0,
//           totalDuration: 45,
//           timeSpent: 0,
//           enrolledDate: "2024-01-22",
//           lastAccessed: null,
//           nextLesson: {
//             id: 1,
//             title: "Introduction to Node.js",
//             duration: 20,
//           },
//           status: "not-started",
//         },
//       ]);

//       setLoading(false);
//     };

//     loadMyCourses();
//   }, []);

//   const filteredCourses = courses.filter((course) => {
//     const matchesSearch =
//       course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       course.instructor.toLowerCase().includes(searchTerm.toLowerCase());

//     const matchesStatus =
//       statusFilter === "all" || course.status === statusFilter;

//     return matchesSearch && matchesStatus;
//   });

//   const getStatusBadge = (status) => {
//     const badges = {
//       "in-progress": {
//         color: "bg-blue-100 text-blue-700",
//         text: "In Progress",
//       },
//       completed: { color: "bg-green-100 text-green-700", text: "Completed" },
//       "not-started": {
//         color: "bg-gray-100 text-gray-700",
//         text: "Not Started",
//       },
//     };

//     return badges[status] || badges["not-started"];
//   };

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString("en-US", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });
//   };

//   const calculateTimeRemaining = (timeSpent, totalDuration) => {
//     const remaining = totalDuration - timeSpent;
//     return remaining > 0 ? remaining : 0;
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-96">
//         <LoadingSpinner size="lg" />
//       </div>
//     );
//   }

//   return (
//     <div className="container py-8">
//       {/* Header */}
//       <div className="mb-8">
//         <h1 className="text-2xl font-bold text-text-dark mb-2">My Courses</h1>
//         <p className="text-text-medium">
//           Continue your learning journey and track your progress
//         </p>
//       </div>

//       {/* Stats Overview */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//         <div className="card text-center">
//           <div className="text-2xl font-bold text-primary mb-1">
//             {courses.length}
//           </div>
//           <div className="text-sm text-text-medium">Total Courses</div>
//         </div>
//         <div className="card text-center">
//           <div className="text-2xl font-bold text-blue-600 mb-1">
//             {courses.filter((c) => c.status === "in-progress").length}
//           </div>
//           <div className="text-sm text-text-medium">In Progress</div>
//         </div>
//         <div className="card text-center">
//           <div className="text-2xl font-bold text-green-600 mb-1">
//             {courses.filter((c) => c.status === "completed").length}
//           </div>
//           <div className="text-sm text-text-medium">Completed</div>
//         </div>
//         <div className="card text-center">
//           <div className="text-2xl font-bold text-yellow-600 mb-1">
//             {courses.reduce((total, course) => total + course.timeSpent, 0)}h
//           </div>
//           <div className="text-sm text-text-medium">Total Hours</div>
//         </div>
//       </div>

//       {/* Search and Filters */}
//       <div className="flex flex-col md:flex-row gap-4 mb-6">
//         <div className="flex-1 relative">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light h-4 w-4" />
//           <input
//             type="text"
//             placeholder="Search your courses..."
//             className="input pl-10"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>

//         <select
//           value={statusFilter}
//           onChange={(e) => setStatusFilter(e.target.value)}
//           className="input w-auto min-w-40"
//         >
//           {statusOptions.map((option) => (
//             <option key={option.id} value={option.id}>
//               {option.name}
//             </option>
//           ))}
//         </select>
//       </div>

//       {/* Course List */}
//       <div className="space-y-6">
//         {filteredCourses.map((course) => (
//           <CourseCard key={course.id} course={course} />
//         ))}
//       </div>

//       {/* No Courses */}
//       {filteredCourses.length === 0 && (
//         <div className="text-center py-12">
//           <BookOpen className="h-12 w-12 text-text-light mx-auto mb-4" />
//           <h3 className="text-lg font-medium text-text-dark mb-2">
//             {courses.length === 0
//               ? "You haven't enrolled in any courses yet"
//               : "No courses match your filters"}
//           </h3>
//           <p className="text-text-medium mb-6">
//             {courses.length === 0
//               ? "Explore our course catalog to start learning something new"
//               : "Try adjusting your search or filter criteria"}
//           </p>
//           {courses.length === 0 && (
//             <>
//               <Link to="/app/courses/management">
//                 <Button variant="secondary" className="mr-3">
//                   <Settings className="h-4 h-4 mr-2" />
//                   Manage Courses
//                 </Button>
//               </Link>
//               <Link to="/courses">
//                 <Button>
//                   <BookOpen className="h-4 w-4 mr-2" />
//                   Browse Courses
//                 </Button>
//               </Link>
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// // Course Card Component
// const CourseCard = ({ course }) => {
//   const statusBadge = getStatusBadge(course.status);
//   const timeRemaining = calculateTimeRemaining(
//     course.timeSpent,
//     course.totalDuration,
//   );

//   return (
//     <div className="card course-card">
//       <div className="flex flex-col lg:flex-row gap-6">
//         {/* Course Image */}
//         <div className="lg:w-48 flex-shrink-0">
//           <img
//             src={course.thumbnail}
//             alt={course.title}
//             className="w-full h-32 lg:h-28 object-cover rounded-lg"
//           />
//         </div>

//         {/* Course Content */}
//         <div className="flex-1 min-w-0">
//           <div className="flex items-start justify-between mb-3">
//             <div>
//               <h3 className="text-xl font-semibold text-text-dark mb-1">
//                 {course.title}
//               </h3>
//               <p className="text-text-medium text-sm">by {course.instructor}</p>
//             </div>
//             <span
//               className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
//             >
//               {statusBadge.text}
//             </span>
//           </div>

//           {/* Progress Bar */}
//           <div className="mb-4">
//             <div className="flex items-center justify-between mb-1">
//               <span className="text-sm text-text-medium">Progress</span>
//               <span className="text-sm font-medium text-text-dark">
//                 {course.progress}%
//               </span>
//             </div>
//             <div className="progress-bar">
//               <div
//                 className="progress-fill"
//                 style={{ width: `${course.progress}%` }}
//               />
//             </div>
//             <div className="flex items-center justify-between mt-1 text-xs text-text-light">
//               <span>
//                 {course.completedLessons} of {course.totalLessons} lessons
//               </span>
//               <span>
//                 {course.timeSpent}h of {course.totalDuration}h
//               </span>
//             </div>
//           </div>

//           {/* Course Stats */}
//           <div className="flex flex-wrap gap-4 text-sm text-text-light mb-4">
//             <div className="flex items-center">
//               <Calendar className="h-4 w-4 mr-1" />
//               Enrolled {formatDate(course.enrolledDate)}
//             </div>
//             {course.lastAccessed && (
//               <div className="flex items-center">
//                 <Clock className="h-4 w-4 mr-1" />
//                 Last accessed {formatDate(course.lastAccessed)}
//               </div>
//             )}
//             {course.completedDate && (
//               <div className="flex items-center text-green-600">
//                 <CheckCircle className="h-4 w-4 mr-1" />
//                 Completed {formatDate(course.completedDate)}
//               </div>
//             )}
//           </div>

//           {/* Next Lesson or Actions */}
//           {course.status === "not-started" && (
//             <div className="bg-background-light rounded-lg p-4 mb-4">
//               <h4 className="font-medium text-text-dark mb-1">
//                 Ready to start?
//               </h4>
//               <p className="text-sm text-text-medium">
//                 Begin with: {course.nextLesson.title}
//               </p>
//             </div>
//           )}

//           {course.status === "in-progress" && course.nextLesson && (
//             <div className="bg-blue-50 rounded-lg p-4 mb-4">
//               <h4 className="font-medium text-text-dark mb-1">Next lesson</h4>
//               <p className="text-sm text-text-medium">
//                 {course.nextLesson.title} • {course.nextLesson.duration} min
//               </p>
//               {timeRemaining > 0 && (
//                 <p className="text-xs text-blue-600 mt-1">
//                   ~{timeRemaining}h remaining
//                 </p>
//               )}
//             </div>
//           )}

//           {course.status === "completed" && course.certificate && (
//             <div className="bg-green-50 rounded-lg p-4 mb-4">
//               <div className="flex items-center">
//                 <Award className="h-5 w-5 text-green-600 mr-2" />
//                 <div>
//                   <h4 className="font-medium text-green-900">
//                     Course completed!
//                   </h4>
//                   <p className="text-sm text-green-700">
//                     Certificate available for download
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Action Buttons */}
//         <div className="lg:w-40 flex-shrink-0 flex flex-col gap-2">
//           {course.status === "completed" ? (
//             <>
//               <Button size="sm" variant="secondary">
//                 <BarChart3 className="h-4 w-4 mr-2" />
//                 View Stats
//               </Button>
//               {course.certificate && (
//                 <Button size="sm">
//                   <Award className="h-4 w-4 mr-2" />
//                   Certificate
//                 </Button>
//               )}
//             </>
//           ) : (
//             <>
//               <Button size="sm">
//                 <Play className="h-4 w-4 mr-2" />
//                 {course.status === "not-started" ? "Start Course" : "Continue"}
//               </Button>
//               <Button size="sm" variant="secondary">
//                 <Target className="h-4 w-4 mr-2" />
//                 View Details
//               </Button>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// // Helper function (moved outside component)
// const getStatusBadge = (status) => {
//   const badges = {
//     "in-progress": { color: "bg-blue-100 text-blue-700", text: "In Progress" },
//     completed: { color: "bg-green-100 text-green-700", text: "Completed" },
//     "not-started": { color: "bg-gray-100 text-gray-700", text: "Not Started" },
//   };

//   return badges[status] || badges["not-started"];
// };

// // Helper function (moved outside component)
// const formatDate = (dateString) => {
//   return new Date(dateString).toLocaleDateString("en-US", {
//     year: "numeric",
//     month: "short",
//     day: "numeric",
//   });
// };

// // Helper function (moved outside component)
// const calculateTimeRemaining = (timeSpent, totalDuration) => {
//   const remaining = totalDuration - timeSpent;
//   return remaining > 0 ? remaining : 0;
// };

// export default MyCourses;

// src/pages/courses/MyCourses.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCourseStore } from '@/store/courseStore'
import { useAuth } from '@/hooks/auth/useAuth'
import {
  BookOpen,
  Clock,
  Play,
  Award,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  Download,
  Star,
  Eye,
  Edit3,
  Flame
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CertificatePreviewModal from '@/components/course/CertificatePreviewModal'
import PageTitle from '@/components/layout/PageTitle'

// Certificate Button Component
function CertificateButton({ course }) {
  const { user } = useAuth();
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const handleViewCertificate = () => {
    setShowCertificateModal(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleViewCertificate}
        title="View Certificate"
      >
        <Award className="w-4 h-4" />
      </Button>

      <CertificatePreviewModal
        courseId={course.id}
        courseName={course.title}
        userId={user?.id}
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
      />
    </>
  );
}

export default function MyCourses() {
  const { user } = useAuth()
  // Store selectors - individual to prevent infinite loops
  const enrolledCourses = useCourseStore(state => state.enrolledCourses);
  const loading = useCourseStore(state => state.loading);
  const error = useCourseStore(state => state.error);
  const fetchEnrolledCourses = useCourseStore(state => state.actions.fetchEnrolledCourses);
  
  const [activeTab, setActiveTab] = useState('all') // 'all', 'in-progress', 'completed', 'not-started'
  const [searchTerm, setSearchTerm] = useState('')

  // Use real enrolled courses from store
  const courses = enrolledCourses || []

  useEffect(() => {
    // Fetch enrolled courses if user is logged in
    if (user) {
      fetchEnrolledCourses(user.id)
    }
  }, [user, fetchEnrolledCourses])

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // For now, show all courses since status filtering needs to be implemented
    const matchesTab = activeTab === 'all' || true
    
    return matchesSearch && matchesTab
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success-default bg-success-light'
      case 'in-progress':
        return 'text-warning-default bg-warning-light'
      case 'not-started':
        return 'text-text-muted bg-background-medium'
      default:
        return 'text-text-muted bg-background-medium'
    }
  }

  const getProgressColor = (progress) => {
    if (progress === 100) return 'bg-success-default'
    if (progress >= 50) return 'bg-warning-default'
    return 'bg-primary-default'
  }

  const formatDuration = (totalMinutes) => {
    const minutes = Math.max(0, Math.floor(totalMinutes || 0))
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
    if (hours > 0) return `${hours}h`
    return `${mins}m`
  }

  // Calculate learning streak from enrollment last_accessed dates
  const calculateStreak = () => {
    if (!courses || courses.length === 0) {
      return { currentStreak: 0, bestStreak: 0 }
    }

    // Get all unique dates when user accessed courses
    const accessDates = courses
      .map(course => course.last_accessed)
      .filter(date => date) // Remove null/undefined
      .map(date => {
        // Convert to date and set to start of day for comparison
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      })
      .filter((date, index, self) => self.indexOf(date) === index) // Get unique dates
      .sort((a, b) => b - a) // Sort descending (most recent first)

    if (accessDates.length === 0) {
      return { currentStreak: 0, bestStreak: 0 }
    }

    // Calculate current streak (consecutive days from most recent access backwards)
    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()
    
    // Check if user accessed today or yesterday (allows for timezone differences)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayTime = yesterday.getTime()
    
    const mostRecentAccess = accessDates[0]
    
    // If most recent access is today or yesterday, the streak is still active
    if (mostRecentAccess === todayTime || mostRecentAccess === yesterdayTime) {
      // Start counting from the most recent access date
      let checkDate = mostRecentAccess
      let dayCount = 0
      
      // Count consecutive days backwards from most recent access
      while (accessDates.includes(checkDate)) {
        dayCount++
        checkDate -= 86400000 // Subtract one day (in milliseconds)
      }
      
      currentStreak = dayCount
    } else {
      // Most recent access was more than 1 day ago, streak is broken
      currentStreak = 0
    }

    // Calculate best streak (longest consecutive sequence)
    let bestStreak = 1
    let tempStreak = 1
    
    for (let i = 1; i < accessDates.length; i++) {
      const daysDiff = (accessDates[i - 1] - accessDates[i]) / 86400000
      
      if (daysDiff === 1) {
        // Consecutive day
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        // Streak broken
        tempStreak = 1
      }
    }

    return {
      currentStreak: currentStreak,
      bestStreak: bestStreak
    }
  }

  const streakData = calculateStreak()

  const CourseCard = ({ course }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="relative">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={`${course.title} thumbnail`}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-background-medium flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-text-muted" />
          </div>
        )}
        
        {/* Progress Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">{course.progress_percentage || 0}% Complete</span>
            <span className="text-sm">Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getProgressColor(course.progress_percentage || 0)}`}
              style={{ width: `${course.progress_percentage || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status || 'active')}`}>
            {course.status || 'active'}
          </span>
        </div>

        {/* Certificate Badge */}
        {course.certificate && (
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 bg-success-default rounded-full flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          {course.difficulty_level && (
            <span className="text-xs bg-primary-light text-primary-default px-2 py-1 rounded-full">
              {course.difficulty_level}
            </span>
          )}
          {course.last_accessed && (
            <span className="text-xs text-text-muted">
              Last: {new Date(course.last_accessed).toLocaleDateString()}
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-text-dark mb-2 line-clamp-2">
          {course.title}
        </h3>
        
        <p className="text-text-light text-sm mb-4">
          {course.description}
        </p>

        <div className="flex items-center gap-4 mb-4 text-sm text-text-muted">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(course.duration_minutes)} total</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-warning-default text-warning-default" />
            <span>{course.rating || '4.5'}</span>
          </div>
        </div>

        {course.last_accessed && (
          <p className="text-xs text-text-muted mb-4">
            Last accessed: {new Date(course.last_accessed).toLocaleDateString()}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            {course.status === 'completed' ? (
              <div className="flex gap-2 w-full">
                <Link to={`/app/courses/${course.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Review Course
                  </Button>
                </Link>
                <CertificateButton course={course} />
              </div>
            ) : course.status === 'not-started' ? (
              <Link to={`/app/courses/${course.id}`} className="w-full">
                <Button className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Start Course
                </Button>
              </Link>
            ) : (
              <Link to={`/app/courses/${course.id}`} className="w-full">
                <Button className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Continue Learning
                </Button>
              </Link>
            )}
          </div>

          {/* Course Editor Button - Show for course creators */}
          {course.created_by === user?.id && (
            <Link to={`/app/editor/${course.id}`} className="w-full">
              <Button variant="outline" className="w-full text-sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Course
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  )

  const getTabCounts = () => {
    const inProgress = courses.filter(c => (c.progress_percentage || 0) > 0 && (c.progress_percentage || 0) < 100).length
    const completed = courses.filter(c => (c.progress_percentage || 0) === 100).length
    const notStarted = courses.filter(c => (c.progress_percentage || 0) === 0).length
    return {
      all: courses.length,
      'in-progress': inProgress,
      completed: completed,
      'not-started': notStarted
    }
  }

  const tabCounts = getTabCounts()

  if (loading.enrollments) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="py-1">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="My Courses"
          subtitle="Continue your learning journey"
        />

        <Link to="/app/courses/catalog">
          <Button>
            <BookOpen className="w-4 h-4 mr-2" />
            Browse More Courses
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Enrolled - Blue */}
        <Card className="p-4 bg-background-white border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {courses.length}
              </div>
              <div className="text-xs font-medium text-text-medium">Total Enrolled</div>
            </div>
          </div>
        </Card>
        
        {/* In Progress - Orange/Yellow */}
        <Card className="p-4 bg-background-white border border-orange-200 hover:border-orange-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {courses.filter(c => (c.progress_percentage || 0) > 0 && (c.progress_percentage || 0) < 100).length}
              </div>
              <div className="text-xs font-medium text-text-medium">In Progress</div>
            </div>
          </div>
        </Card>
        
        {/* Completed - Green */}
        <Card className="p-4 bg-background-white border border-green-200 hover:border-green-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Award className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {courses.filter(c => c.progress_percentage === 100).length}
              </div>
              <div className="text-xs font-medium text-text-medium">Completed</div>
            </div>
          </div>
        </Card>
        
        {/* Total Duration - Purple/Indigo */}
        <Card className="p-4 bg-background-white border border-indigo-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-indigo-600 mb-1">
                {formatDuration(courses.reduce((total, course) => total + (course.duration_minutes || 0), 0))}
              </div>
              <div className="text-xs font-medium text-text-medium">Total Duration</div>
            </div>
          </div>
        </Card>
        
        {/* Learning Streak - Red/Orange */}
        <Card className="p-4 bg-background-white border border-red-200 hover:border-red-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {streakData.currentStreak}
              </div>
              <div className="text-xs font-medium text-text-medium">Day Streak</div>
              <div className="text-xs text-text-light mt-0.5">
                Best: {streakData.bestStreak} days
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search your courses..."
              className="w-full pl-10 pr-4 py-2 border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-background-dark">
        <nav className="flex space-x-8">
          {[
            { id: 'all', label: 'All Courses', count: tabCounts.all },
            { id: 'in-progress', label: 'In Progress', count: tabCounts['in-progress'] },
            { id: 'completed', label: 'Completed', count: tabCounts.completed },
            { id: 'not-started', label: 'Not Started', count: tabCounts['not-started'] }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-default text-primary-default'
                  : 'border-transparent text-text-light hover:text-text-medium'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'bg-primary-light text-primary-default'
                  : 'bg-background-medium text-text-muted'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-dark mb-2">
            {searchTerm ? 'No courses found' : 'No courses yet'}
          </h3>
          <p className="text-text-light mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Start your learning journey by enrolling in a course'
            }
          </p>
          {!searchTerm && (
            <Link to="/app/courses/catalog">
              <Button>Browse Course Catalog</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {/* <Card className="p-6">
        <h2 className="text-xl font-semibold text-text-dark mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="secondary" className="h-auto p-4 flex-col">
            <TrendingUp className="w-8 h-8 mb-2" />
            <span>View Progress Report</span>
          </Button>
          
          <Button variant="secondary" className="h-auto p-4 flex-col">
            <Award className="w-8 h-8 mb-2" />
            <span>Download Certificates</span>
          </Button>
          
          <Button variant="secondary" className="h-auto p-4 flex-col">
            <Calendar className="w-8 h-8 mb-2" />
            <span>Set Learning Goals</span>
          </Button>
        </div>
      </Card> */}
      </div>
    </div>
  )
}