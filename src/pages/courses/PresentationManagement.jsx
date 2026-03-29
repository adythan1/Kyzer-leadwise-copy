// src/pages/courses/PresentationManagement.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourseStore } from '@/store/courseStore';
import { useAuth } from '@/hooks/auth/useAuth';
import { useToast } from '@/components/ui';
import Button from '@/components/ui/Button';
import BackButton from '@/components/ui/BackButton';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LessonCurationForm from '@/components/course/LessonCurationForm';
import PresentationViewer from '@/components/course/PresentationViewer';
import PresentationThumbnail from '@/components/course/PresentationThumbnail';
import SlideThumbnail from '@/components/course/SlideThumbnail';
import PresentationCard from '@/components/course/PresentationCard';
import PageTitle from '@/components/layout/PageTitle';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  Settings,
  FileText,
  Image,
  Video,
  File,
  Music,
  Grid3X3,
  ChevronDown,
  ChevronUp,
  List
} from 'lucide-react';

export default function PresentationManagement() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  
  const [lesson, setLesson] = useState(null);
  const [presentation, setPresentation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSlideDetails, setShowSlideDetails] = useState(false);

  // Track if data has been loaded to prevent infinite loops
  const dataLoadedRef = useRef({ lessonId: null });
  const isLoadingRef = useRef(false);

  // Function to refresh presentation data
  const refreshPresentationData = async () => {
    if (!lessonId) return;
    
    try {
      const { actions } = useCourseStore.getState();
      const presentationResult = await actions.fetchPresentationByLesson(lessonId);
      if (presentationResult.error) {
        setPresentation(null);
      } else if (presentationResult.data) {
        setPresentation(presentationResult.data);
      }
    } catch (err) {
      // Handle error silently
    }
  };

  useEffect(() => {
    // Early return if no lessonId
    if (!lessonId) {
      showError('No lesson ID provided');
      return;
    }

    // Prevent re-fetching if we've already loaded data for this lesson
    if (dataLoadedRef.current.lessonId === lessonId) {
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return;
    }

    const loadData = async () => {
      isLoadingRef.current = true;
      try {
        setLoading(true);
        
        // Get actions from store directly to avoid dependency issues
        const { actions } = useCourseStore.getState();
        
        // Fetch lesson details
        const lessonResult = await actions.fetchLesson(lessonId);
        if (lessonResult.error) {
          showError('Failed to load lesson: ' + lessonResult.error);
          setLoading(false);
          return;
        }
        
        if (!lessonResult.data) {
          showError('Lesson not found');
          setLoading(false);
          return;
        }
        
        setLesson(lessonResult.data);

        // Fetch presentation if it exists
        const presentationResult = await actions.fetchPresentationByLesson(lessonId);
        if (presentationResult.error) {
          // Don't show error for missing presentation, it's optional
          setPresentation(null);
        } else if (presentationResult.data) {
          setPresentation(presentationResult.data);
        }
        
        // Mark data as loaded for this lesson
        dataLoadedRef.current = { lessonId };
        setLoading(false);
      } catch (err) {
        showError('Failed to load data: ' + err.message);
        setLoading(false);
        // Don't mark as loaded on error - allow retry on next render
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadData();
  }, [lessonId]);

  const handleCreatePresentation = () => {
    setShowForm(true);
  };

  const handleEditPresentation = () => {
    setShowForm(true);
  };

  const handleDeletePresentation = async () => {
    if (!presentation) return;
    
    if (!window.confirm('Are you sure you want to delete this presentation? This action cannot be undone.')) {
      return;
    }

    try {
      const { actions } = useCourseStore.getState();
      const result = await actions.deletePresentation(presentation.id);
      if (result.error) {
        showError('Failed to delete presentation: ' + result.error);
        return;
      }
      
      setPresentation(null);
      success('Presentation deleted successfully');
    } catch (err) {
      showError('Failed to delete presentation: ' + err.message);
    }
  };

  const handleFormSuccess = (newPresentation) => {
    setPresentation(newPresentation);
    setShowForm(false);
    success('Presentation saved successfully');
    // Also refresh to ensure we have the latest data
    refreshPresentationData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    // Refresh presentation data when returning from form
    refreshPresentationData();
  };

  const handleViewPresentation = () => {
    setShowViewer(true);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setIsFullscreen(false);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getContentTypeIcon = (contentType) => {
    switch (contentType) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'pdf': return <File className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'quiz': return <Grid3X3 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!lesson) {
    const handleTestDatabase = async () => {
      const { actions } = useCourseStore.getState();
      const result = await actions.testPresentationTables();
      if (result.success) {
        success('Database tables are working correctly!');
      } else {
        showError(`Database issue: ${result.error}`);
      }
    };

    return (
      <div className="text-center text-gray-500 p-8">
        <div className="text-gray-500 text-lg mb-2">Lesson not found</div>
        <div className="text-sm text-gray-400 mb-4">
          Course ID: {courseId}<br />
          Lesson ID: {lessonId}
        </div>
        <div className="space-y-2">
          <BackButton text="Go Back" />
          <Button 
            variant="outline" 
            onClick={handleTestDatabase}
            className="ml-2"
          >
            Test Database
          </Button>
        </div>
        <div className="mt-4 text-xs text-gray-400">
          If the lesson exists but you're seeing this error, the database tables might not be set up. 
          Run the <code>lesson_curation_schema.sql</code> script in your Supabase SQL editor.
        </div>
      </div>
    );
  }

  if (lesson.content_type !== 'presentation') {
    return (
      <div className="text-center text-gray-500 p-8">
        <div className="text-gray-500 text-lg mb-2">This lesson is not a presentation</div>
        <p className="text-sm mb-4">Only lessons with content type "Presentation" can be managed here.</p>
        <BackButton text="Go Back" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="max-w-8xl mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleFormCancel}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Management
          </Button>
        </div>
        <LessonCurationForm
          presentation={presentation}
          lessonId={lessonId}
          courseId={courseId}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  if (showViewer && presentation) {
    return (
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'max-w-8xl mx-auto p-6'}`}>
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleCloseViewer}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Management
          </Button>
        </div>
        <PresentationViewer
          presentation={presentation}
          userId={user?.id}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onPresentationComplete={() => {
            success('Presentation completed!');
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Course
        </Button>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageTitle
            title={lesson.title}
            subtitle="Presentation Management"
          />

          <div className="flex flex-wrap items-center gap-3">
            {presentation ? (
              <>
                <Button
                  onClick={handleViewPresentation}
                  variant="outline"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Presentation
                </Button>
                <Button
                  onClick={handleEditPresentation}
                  variant="outline"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={handleDeletePresentation}
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <Button onClick={handleCreatePresentation}>
                <Plus className="w-4 h-4 mr-2" />
                Create Presentation
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {presentation ? (
        <div className="space-y-6">
          {/* Presentation Info with Thumbnail */}
          <PresentationCard
            presentation={presentation}
            onView={handleViewPresentation}
            onEdit={handleEditPresentation}
            onDelete={handleDeletePresentation}
            showActions={true}
            compact={false}
          />

          {/* Slides Overview */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Slides Overview</h3>
                <Button
                  onClick={handleEditPresentation}
                  variant="outline"
                  size="sm"
                  className="text-sm"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit Slides
                </Button>
              </div>

              {presentation.slides && presentation.slides.length > 0 ? (
                <div className="space-y-6">
                  {/* Visual Slide Grid */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Slide Thumbnails</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {presentation.slides.map((slide, index) => (
                        <div key={slide.id} className="flex flex-col items-center">
                          <SlideThumbnail
                            slide={slide}
                            index={index}
                            size="small"
                            onClick={() => handleViewPresentation()}
                            className="hover:scale-105 transition-transform"
                          />
                          <div className="mt-1 text-xs text-gray-500 text-center">
                            <div className="font-medium truncate w-24">
                              {slide.title || `Slide ${slide.slide_number}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200"></div>

                  {/* Collapsible Detailed Slide List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Slide Details</h4>
                        {!showSlideDetails && (
                          <p className="text-xs text-gray-500 mt-1">
                            View detailed information about all {presentation.slides.length} slides
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => setShowSlideDetails(!showSlideDetails)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-xs h-8"
                      >
                        <List className="w-3 h-3" />
                        {showSlideDetails ? 'Hide Details' : 'Show Details'}
                        {showSlideDetails ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </Button>
                    </div>

                    {/* Collapsible content with animation */}
                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        showSlideDetails
                          ? 'max-h-screen opacity-100'
                          : 'max-h-0 opacity-0'
                      }`}
                      style={{
                        maxHeight: showSlideDetails ? `${presentation.slides.length * 120}px` : '0px'
                      }}
                    >
                      <div className="space-y-3 mt-3">
                        {presentation.slides.map((slide, index) => (
                            <div
                              key={slide.id}
                              className={`flex items-center gap-4 p-3 border rounded-lg hover:shadow-sm transition-shadow ${
                                slide.content_type === 'quiz'
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              {/* Slide thumbnail */}
                              <div className="flex-shrink-0">
                                <SlideThumbnail
                                  slide={slide}
                                  index={index}
                                  size="small"
                                  onClick={() => handleViewPresentation()}
                                />
                              </div>

                              {/* Slide info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    slide.content_type === 'quiz'
                                      ? 'bg-blue-200 text-blue-700'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}>
                                    {slide.content_type === 'quiz' ? 'Quiz' : slide.content_type}
                                  </span>
                                  {slide.is_required && (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                                      Required
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-medium text-gray-900 truncate">
                                  {slide.title}
                                </h4>

                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  <span>Slide {slide.slide_number}</span>
                                  {slide.duration_seconds && (
                                    <span>{slide.duration_seconds}s</span>
                                  )}
                                  {slide.content_type === 'quiz' && slide.metadata && (
                                    <>
                                      {slide.metadata.question_count && (
                                        <span>{slide.metadata.question_count} questions</span>
                                      )}
                                      {slide.metadata.time_limit_minutes && (
                                        <span>{slide.metadata.time_limit_minutes}min limit</span>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Quiz metadata */}
                                {slide.content_type === 'quiz' && slide.metadata && (
                                  <div className="mt-2 flex items-center gap-3 text-xs text-blue-600">
                                    {slide.metadata.pass_threshold && (
                                      <span>Pass: {slide.metadata.pass_threshold}%</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Action button */}
                              <div className="flex-shrink-0">
                                <Button
                                  onClick={() => handleViewPresentation()}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-medium text-gray-600 mb-2">No slides yet</h4>
                  <p className="text-sm text-gray-500 mb-4">Start building your presentation by adding some slides.</p>
                  <Button onClick={handleEditPresentation} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Slide
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Presentation Created
            </h3>
            <p className="text-gray-600 mb-6">
              This lesson is set up for presentations but doesn't have one yet. Create a presentation to start adding and arranging content.
            </p>
            <Button onClick={handleCreatePresentation}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Presentation
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
