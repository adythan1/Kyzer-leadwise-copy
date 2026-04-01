// src/components/course/PresentationCard.jsx
import React from 'react';
import {
  Eye,
  Edit,
  Trash2,
  Settings,
  Grid3X3,
  Clock,
  PlayCircle,
  LayoutGrid,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import MetricTile from '@/components/ui/MetricTile';
import PresentationThumbnail from './PresentationThumbnail';

const PresentationCard = ({
  presentation,
  onView,
  onEdit,
  onDelete,
  showActions = true,
  compact = false,
  className = ""
}) => {
  if (!presentation) return null;

  const slideCount = presentation.slides?.length || 0;
  const hasQuiz = presentation.slides?.some(slide => slide.content_type === 'quiz') || false;

  if (compact) {
    return (
      <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${className}`}>
        <div className="p-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <PresentationThumbnail
                presentation={presentation}
                size="medium"
                showInfo={false}
                onClick={onView}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-lg mb-2 truncate">
                {presentation.title || 'Untitled Presentation'}
              </h3>

              {presentation.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {presentation.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Settings className="w-4 h-4" />
                  <span>{slideCount} slides</span>
                </div>
                {presentation.estimated_duration && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{presentation.estimated_duration}min</span>
                    </div>
                  </>
                )}
                {hasQuiz && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Grid3X3 className="w-4 h-4" />
                      <span>Quiz</span>
                    </div>
                  </>
                )}
              </div>

              {showActions && (
                <div className="flex items-center gap-2">
                  {onView && (
                    <Button size="sm" onClick={onView} className="text-sm">
                      <PlayCircle className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  )}
                  {onEdit && (
                    <Button size="sm" variant="outline" onClick={onEdit} className="text-sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onDelete}
                      className="text-sm text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      <div className="p-6">
        <div className="flex gap-6">
          {/* Presentation Thumbnail */}
          <div className="flex-shrink-0">
            <PresentationThumbnail
              presentation={presentation}
              size="large"
              showInfo={false}
              onClick={onView}
              className="border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            />
          </div>

          {/* Presentation Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {presentation.title || 'Untitled Presentation'}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Settings className="w-4 h-4" />
                    <span>{slideCount} slides</span>
                  </div>
                  {presentation.estimated_duration && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{presentation.estimated_duration}min</span>
                      </div>
                    </>
                  )}
                  {hasQuiz && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Grid3X3 className="w-4 h-4" />
                        <span>Contains Quiz</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {presentation.description && (
              <p className="text-gray-600 mb-6 leading-relaxed">{presentation.description}</p>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MetricTile
                layout="stack"
                title="Total Slides"
                value={slideCount}
                variant="blue"
                icon={LayoutGrid}
                paddingClassName="p-3"
              />
              <MetricTile
                layout="stack"
                title="Minutes"
                value={presentation.estimated_duration || '~'}
                variant="green"
                icon={Clock}
                paddingClassName="p-3"
              />
              <MetricTile
                layout="stack"
                title="Quiz Slides"
                value={
                  presentation.slides?.filter(
                    (slide) => slide.content_type === 'quiz'
                  ).length || 0
                }
                variant="purple"
                icon={Grid3X3}
                paddingClassName="p-3"
              />
            </div>

            {/* Action Buttons */}
            {showActions && (
              <div className="flex items-center gap-3">
                {onView && (
                  <Button onClick={onView} className="bg-blue-600 hover:bg-blue-700">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    View Presentation
                  </Button>
                )}
                {onEdit && (
                  <Button onClick={onEdit} variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Presentation
                  </Button>
                )}
                {onDelete && (
                  <Button
                    onClick={onDelete}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PresentationCard;