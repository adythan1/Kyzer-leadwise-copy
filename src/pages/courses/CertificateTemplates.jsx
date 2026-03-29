// src/pages/courses/CertificateTemplates.jsx
import { useState, useEffect } from 'react';
import { useCourseStore } from '@/store/courseStore';
import { useAuth } from '@/hooks/auth/useAuth';
import { sanitizeTemplateUrl } from '@/utils/certificateUtils';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Upload,
  Download,
  FileImage,
  Star,
  Copy,
  Settings,
  AlertCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import CertificateTemplateForm from '@/components/course/CertificateTemplateForm';

export default function CertificateTemplates() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  // Store selectors
  const certificateTemplates = useCourseStore(state => state.certificateTemplates);
  const loading = useCourseStore(state => state.loading);

  const fetchCertificateTemplates = useCourseStore(state => state.actions.fetchCertificateTemplates);
  const createCertificateTemplate = useCourseStore(state => state.actions.createCertificateTemplate);
  const updateCertificateTemplate = useCourseStore(state => state.actions.updateCertificateTemplate);
  const deleteCertificateTemplate = useCourseStore(state => state.actions.deleteCertificateTemplate);

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ show: false, template: null });
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    const loadTemplates = async () => {
      const result = await fetchCertificateTemplates();
      if (result.error) {
        if (result.error.message?.includes('does not exist') || result.error.code === 'PGRST106') {
          showError('Certificate templates table not found. Please run the database setup first.');
        } else if (result.error.code === 'TIMEOUT') {
          showError('Certificate templates took too long to load. Try again.');
        } else {
          showError('Failed to load certificate templates');
        }
      }
    };

    loadTemplates();
  }, [fetchCertificateTemplates, showError]);

  const handleCreateTemplate = async (templateData) => {
    const result = await createCertificateTemplate({
      ...templateData,
      created_by: user?.id
    });

    if (result.error) {
      showError('Failed to create certificate template');
    } else {
      success('Certificate template created successfully');
      setShowForm(false);
    }
  };

  const handleUpdateTemplate = async (templateData) => {
    const result = await updateCertificateTemplate(editingTemplate.id, templateData);

    if (result.error) {
      showError('Failed to update certificate template');
    } else {
      success('Certificate template updated successfully');
      setEditingTemplate(null);
      setShowForm(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (deleteDialog.template) {
      const result = await deleteCertificateTemplate(deleteDialog.template.id);

      if (result.error) {
        showError('Failed to delete certificate template');
      } else {
        success('Certificate template deleted successfully');
      }

      setDeleteDialog({ show: false, template: null });
    }
  };

  const handleSetDefault = async (templateId) => {
    // First, unset all other templates as default
    const updatePromises = certificateTemplates
      .filter(t => t.id !== templateId && t.is_default)
      .map(t => updateCertificateTemplate(t.id, { is_default: false }));

    await Promise.all(updatePromises);

    // Set the selected template as default
    const result = await updateCertificateTemplate(templateId, { is_default: true });

    if (result.error) {
      showError('Failed to set default template');
    } else {
      success('Default template updated successfully');
    }
  };

  const availablePlaceholders = [
    { key: '{{user_name}}', description: 'Full name of the certificate recipient' },
    { key: '{{course_title}}', description: 'Title of the completed course' },
    { key: '{{completion_date}}', description: 'Date when the course was completed' },
    { key: '{{issue_date}}', description: 'Date when the certificate was issued' },
    { key: '{{instructor_name}}', description: 'Name of the course instructor' },
    { key: '{{certificate_id}}', description: 'Unique certificate identifier' },
    { key: '{{organization_name}}', description: 'Name of the organization (if applicable)' }
  ];

  if (loading.courses) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-text-dark mb-2">Certificate Templates</h1>
            <p className="text-text-light">
              Manage certificate templates for course completion
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>

      {/* Placeholders Help */}
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-text-dark mb-2">Available Placeholders</h3>
            <p className="text-sm text-text-light mb-3">
              Use these placeholders in your certificate templates. They will be automatically replaced with actual data when certificates are generated.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availablePlaceholders.map((placeholder) => (
            <div key={placeholder.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono">
                {placeholder.key}
              </code>
              <span className="text-sm text-text-medium">{placeholder.description}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Setup Instructions */}
      {certificateTemplates.length === 0 && !loading.courses && (
        <Card className="p-12 text-center">
          <FileImage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-dark mb-2">Certificate Templates Setup</h3>
          <div className="text-text-light mb-6 space-y-3">
            <p>To use certificate templates, you need to set up the database first:</p>
            <div className="bg-gray-50 p-4 rounded-lg text-left text-sm">
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to your Supabase project dashboard</li>
                <li>Navigate to SQL Editor</li>
                <li>Run the SQL commands from <code>CERTIFICATE_TEMPLATES_SCHEMA.sql</code></li>
                <li>Create a public storage bucket named "certificates"</li>
                <li>Refresh this page to start creating templates</li>
              </ol>
            </div>
            <p>Once set up, you can create certificate templates to automatically issue personalized certificates to learners.</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="secondary" className="mr-3">
            Refresh Page
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Template
          </Button>
        </Card>
      )}

      {/* Templates Grid */}
      {certificateTemplates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificateTemplates.map((template) => (
            <Card key={template.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-text-dark">{template.name}</h3>
                  {template.is_default && (
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewTemplate(template)}
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowForm(true);
                    }}
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialog({ show: true, template })}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-text-light mb-4">{template.description}</p>
              )}

              {/* Template Preview */}
              {sanitizeTemplateUrl(template.template_url) ? (
                <div className="mb-4">
                  <img
                    src={sanitizeTemplateUrl(template.template_url)}
                    alt={template.name}
                    className="w-full h-32 object-cover border border-gray-200 rounded"
                  />
                </div>
              ) : (
                <div className="mb-4 w-full h-32 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                  <span className="text-sm text-gray-400">No preview available</span>
                </div>
              )}

              {/* Placeholders Info */}
              {template.placeholders && Object.keys(template.placeholders).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-text-light mb-2">
                    Placeholders: {Object.keys(template.placeholders).length}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(template.placeholders).slice(0, 3).map((key) => (
                      <span key={key} className="bg-gray-100 text-xs px-2 py-1 rounded">
                        {key}
                      </span>
                    ))}
                    {Object.keys(template.placeholders).length > 3 && (
                      <span className="text-xs text-text-light">
                        +{Object.keys(template.placeholders).length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {!template.is_default && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetDefault(template.id)}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Set Default
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate({ ...template });
                    setShowForm(true);
                  }}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Duplicate
                </Button>
              </div>

              {/* Created info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-text-light">
                  Created {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Template Form Modal */}
      {showForm && (
        <CertificateTemplateForm
          template={editingTemplate}
          availablePlaceholders={availablePlaceholders}
          onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
          onCancel={() => {
            setShowForm(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.show}
        onClose={() => setDeleteDialog({ show: false, template: null })}
        onConfirm={handleDeleteTemplate}
        title="Delete Certificate Template"
        message={`Are you sure you want to delete "${deleteDialog.template?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
      />

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Preview: {previewTemplate.name}</h3>
                <Button variant="ghost" onClick={() => setPreviewTemplate(null)}>
                  ×
                </Button>
              </div>
              {sanitizeTemplateUrl(previewTemplate.template_url) ? (
                <img
                  src={sanitizeTemplateUrl(previewTemplate.template_url)}
                  alt={previewTemplate.name}
                  className="w-full border border-gray-200 rounded"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-400">No preview available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}