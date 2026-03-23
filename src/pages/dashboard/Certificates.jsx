// src/pages/dashboard/Certificates.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { useCourseStore } from '@/store/courseStore';
import { useAuth } from '@/hooks/auth/useAuth';
import { Award, BookOpen, Calendar, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import CertificatePreviewModal from '@/components/course/CertificatePreviewModal';
import CertificateGalleryCard from '@/components/dashboard/CertificateGalleryCard';

function getCertificateDisplayStatus(certificate) {
  if (certificate.status) return certificate.status;
  if (certificate.issued_at) return 'completed';
  return 'pending';
}

function getCourseTitle(certificate) {
  return (
    certificate.course?.title ||
    certificate.certificate_data?.course_title ||
    certificate.course_name ||
    certificate.course_title ||
    'Course'
  );
}

function getRecipientName(certificate, profile, user) {
  const fromCert = certificate.certificate_data?.user_name?.trim();
  if (fromCert) return fromCert;
  const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (user?.user_metadata?.full_name?.trim()) return user.user_metadata.full_name.trim();
  if (user?.email) return user.email;
  return 'Learner';
}

function formatIssuedLabel(certificate) {
  const raw = certificate.issued_at || certificate.completed_at;
  if (!raw) return null;
  try {
    return `Issued ${new Date(raw).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })}`;
  } catch {
    return null;
  }
}

export default function Certificates() {
  const { user, profile } = useAuth();
  const certificates = useCourseStore((state) => state.certificates);
  const fetchCertificates = useCourseStore((state) => state.actions.fetchCertificates);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [preview, setPreview] = useState({
    open: false,
    courseId: null,
    courseName: '',
  });

  useEffect(() => {
    const loadCertificates = async () => {
      if (user?.id) {
        try {
          await fetchCertificates(user.id);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadCertificates();
  }, [user?.id, fetchCertificates]);

  useEffect(() => {
    let filtered = certificates;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (cert) =>
          getCourseTitle(cert).toLowerCase().includes(q) ||
          cert.course?.description?.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((cert) => getCertificateDisplayStatus(cert) === filterStatus);
    }

    setFilteredCertificates(filtered);
  }, [certificates, searchTerm, filterStatus]);

  const openPreview = useCallback((certificate) => {
    const courseId = certificate.course_id || certificate.course?.id;
    const courseName = getCourseTitle(certificate);
    if (!courseId) {
      toast.error('Course information is missing for this certificate.');
      return;
    }
    setPreview({ open: true, courseId, courseName });
  }, []);

  const closePreview = useCallback(() => {
    setPreview((prev) => ({ ...prev, open: false }));
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-800';
      case 'pending':
        return 'bg-amber-50 text-amber-900';
      case 'expired':
        return 'bg-red-50 text-red-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const latestIssuedLabel = useMemo(() => {
    if (!certificates.length) return null;
    const sorted = [...certificates].sort(
      (a, b) => new Date(b.issued_at || 0) - new Date(a.issued_at || 0)
    );
    return formatIssuedLabel(sorted[0]);
  }, [certificates]);

  if (loading) {
    return (
      <div className="space-y-8 bg-background-light -mx-4 px-4 py-6 sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent rounded-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-9 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-200 rounded w-2/3 max-w-md" />
        </div>
        <div className="flex flex-wrap gap-8 justify-center lg:justify-start">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full max-w-[340px] animate-pulse"
            >
              <div className="h-[240px] bg-[#0C1C4F]/30 rounded-sm" />
              <div className="h-12 bg-[#1565FF]/40 rounded-b-md mt-0.5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-background-light -mx-4 px-4 py-6 sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent rounded-lg">
      <CertificatePreviewModal
        courseId={preview.courseId}
        courseName={preview.courseName}
        userId={user?.id}
        isOpen={preview.open}
        onClose={closePreview}
      />

      <header className="space-y-1">
        <h1 className="relative inline-block text-2xl font-bold text-text-dark pb-3">
          Certificates
          <span
            className="absolute bottom-0 left-0 h-1 w-14 rounded-full bg-[#1565FF]"
            aria-hidden
          />
        </h1>
        <p className="text-text-light text-sm sm:text-base pt-1">
          Your achievements and completed courses
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <Card className="p-5 border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-text-light">Total certificates</p>
              <p className="text-2xl font-bold text-text-dark">{certificates.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#1565FF]" />
            </div>
            <div>
              <p className="text-sm text-text-light">Most recent</p>
              <p className="text-base font-semibold text-text-dark">
                {latestIssuedLabel || '—'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5 border-border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="search"
              placeholder="Search by course name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-[#1565FF]/30 focus:border-[#1565FF]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-border rounded-lg text-sm bg-background-white focus:ring-2 focus:ring-[#1565FF]/30 focus:border-[#1565FF]"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </Card>

      {filteredCertificates.length === 0 ? (
        <Card className="p-12 text-center border-border shadow-sm">
          <Award className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-dark mb-2">No certificates found</h3>
          <p className="text-text-light mb-6 max-w-md mx-auto">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Complete a course to earn your first certificate.'}
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <Link
              to="/app/courses"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1565FF] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1565FF]"
            >
              <BookOpen className="w-4 h-4" />
              Browse courses
            </Link>
          )}
        </Card>
      ) : (
        <div className="flex flex-wrap gap-8 justify-center lg:justify-start pb-4">
          {filteredCertificates.map((certificate) => {
            const displayStatus = getCertificateDisplayStatus(certificate);
            const showStatusChip = displayStatus !== 'completed';
            return (
              <CertificateGalleryCard
                key={certificate.id}
                courseTitle={getCourseTitle(certificate)}
                recipientName={getRecipientName(certificate, profile, user)}
                issuedLabel={formatIssuedLabel(certificate)}
                status={showStatusChip ? displayStatus : null}
                statusClassName={getStatusColor(displayStatus)}
                onViewFull={() => openPreview(certificate)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
