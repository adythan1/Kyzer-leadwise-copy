// src/components/course/CourseStructurePanel.jsx
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FileText,
  X,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Full-width course structure editor for Course Management (modules, lessons, quizzes).
 */
export default function CourseStructurePanel({
  course,
  user,
  onClose,
  loading,
  modules,
  lessons,
  quizzes,
  expandedModules,
  onToggleModuleExpansion,
  onAddModule,
  onAddLesson,
  onAddQuiz,
  onEditModule,
  onDeleteModule,
  onEditLesson,
  onDeleteLesson,
  onManagePresentation,
  onAddQuizForLesson,
  onEditQuiz,
  onDeleteQuiz,
  className = '',
}) {
  if (!course) return null;

  const courseId = course.id;
  const moduleList = modules ?? [];
  const lessonList = lessons ?? [];
  const quizList = quizzes ?? [];

  return (
    <Card
      className={`col-span-full border-2 border-primary-default/20 p-6 shadow-md ${className}`.trim()}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Course structure
          </p>
          <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
          <p className="mt-1 text-sm text-gray-600">
            Modules, lessons, and quizzes for this course. Changes apply immediately after you save
            in each editor.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={onClose}
          className="shrink-0 self-start"
          title="Close structure view"
        >
          <X className="mr-1 h-4 w-4" />
          Close
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="font-medium text-gray-900">Outline</h4>
            {course.created_by === user?.id && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => onAddModule(courseId)}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Add Module
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onAddLesson(courseId)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lesson
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onAddQuiz(courseId)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Quiz
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {moduleList.map((module) => (
              <div key={module.id} className="rounded-lg border border-gray-200">
                <div
                  className="flex cursor-pointer items-center justify-between bg-gray-50 p-3 hover:bg-gray-100"
                  onClick={() => onToggleModuleExpansion(module.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleModuleExpansion(module.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center gap-3">
                    {expandedModules[module.id] ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <h5 className="font-medium text-gray-900">{module.title}</h5>
                      <p className="text-sm text-gray-500">
                        {module.estimated_duration ? `${module.estimated_duration} min` : 'No duration set'}
                        {module.is_required && ' • Required'}
                      </p>
                    </div>
                  </div>

                  {course.created_by === user?.id && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditModule(module, courseId);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteModule(module.id, courseId, module.title);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {expandedModules[module.id] && (
                  <div className="bg-white p-3">
                    {lessonList.filter((lesson) => lesson.module_id === module.id).length > 0 ? (
                      <div className="space-y-2">
                        {lessonList
                          .filter((lesson) => lesson.module_id === module.id)
                          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                          .map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between rounded border-l-4 border-blue-200 bg-gray-50 p-2"
                            >
                              <div className="flex items-center gap-3">
                                {lesson.content_type === 'presentation' ? (
                                  <Settings className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <FileText className="h-4 w-4 text-gray-500" />
                                )}
                                <span className="text-sm font-medium text-gray-500">
                                  {lesson.order_index || '?'}.
                                </span>
                                <div>
                                  <h6 className="font-medium text-gray-900">
                                    {lesson.title || 'Untitled Lesson'}
                                  </h6>
                                  <p className="text-xs text-gray-500">
                                    {lesson.content_type === 'presentation'
                                      ? 'Presentation (Multi-format)'
                                      : lesson.content_type || lesson.lesson_type || 'Unknown'}{' '}
                                    • {lesson.duration_minutes || 0} min
                                  </p>
                                </div>
                              </div>

                              {course.created_by === user?.id && (
                                <div className="flex items-center gap-2">
                                  {lesson.content_type === 'presentation' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onManagePresentation(lesson, courseId)}
                                      className="text-blue-600 hover:text-blue-700"
                                      title="Manage Presentation"
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEditLesson(lesson, courseId)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onAddQuizForLesson(lesson, courseId)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDeleteLesson(lesson, courseId)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm italic text-gray-500">No lessons in this module yet.</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {lessonList.filter((lesson) => !lesson.module_id).length > 0 && (
              <div className="rounded-lg border border-gray-200">
                <div className="border-l-4 border-yellow-400 bg-yellow-50 p-3">
                  <h5 className="mb-2 font-medium text-gray-900">Unassigned Lessons</h5>
                  <div className="space-y-2">
                    {lessonList
                      .filter((lesson) => !lesson.module_id)
                      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                      .map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between rounded border bg-white p-2"
                        >
                          <div className="flex items-center gap-3">
                            {lesson.content_type === 'presentation' ? (
                              <Settings className="h-4 w-4 text-blue-500" />
                            ) : (
                              <FileText className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm font-medium text-gray-500">
                              {lesson.order_index || '?'}.
                            </span>
                            <div>
                              <h6 className="font-medium text-gray-900">
                                {lesson.title || 'Untitled Lesson'}
                              </h6>
                              <p className="text-xs text-gray-500">
                                {lesson.content_type === 'presentation'
                                  ? 'Presentation (Multi-format)'
                                  : lesson.content_type || lesson.lesson_type || 'Unknown'}{' '}
                                • {lesson.duration_minutes || 0} min
                              </p>
                            </div>
                          </div>

                          {course.created_by === user?.id && (
                            <div className="flex items-center gap-2">
                              {lesson.content_type === 'presentation' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onManagePresentation(lesson, courseId)}
                                  className="text-blue-600 hover:text-blue-700"
                                  title="Manage Presentation"
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditLesson(lesson, courseId)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteLesson(lesson, courseId)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {quizList.length > 0 && (
              <div className="rounded-lg border border-gray-200">
                <div className="border-l-4 border-purple-400 bg-purple-50 p-3">
                  <h5 className="mb-2 font-medium text-gray-900">Quizzes</h5>
                  <div className="space-y-2">
                    {quizList.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between rounded border bg-white p-2"
                      >
                        <div>
                          <h6 className="font-medium text-gray-900">{quiz.title}</h6>
                          <p className="text-xs text-gray-500">
                            Pass: {quiz.pass_threshold ?? 0}% • Time limit:{' '}
                            {quiz.time_limit_minutes ?? 0} min
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => onEditQuiz(quiz, courseId)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => onDeleteQuiz(quiz, courseId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {moduleList.length === 0 &&
              lessonList.length === 0 &&
              (!quizList || quizList.length === 0) && (
                <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-600">
                  No modules or lessons yet. Add a module or lesson to build your course outline.
                </p>
              )}
          </div>
        </>
      )}
    </Card>
  );
}
