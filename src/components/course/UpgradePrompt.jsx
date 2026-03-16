import { useNavigate } from 'react-router-dom';
import { Lock, Crown, ArrowRight, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export function UpgradeBanner({ className = '' }) {
  const navigate = useNavigate();

  return (
    <Card className={`p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-100 rounded-xl flex-shrink-0">
          <Crown className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Unlock This Course with a Paid Plan
          </h3>
          <p className="text-gray-600 mb-2">
            This course requires a paid subscription. Sign up for a paid package to access 
            the full course catalog, quizzes, certificates, and premium content.
          </p>
          <p className="text-sm text-amber-700 font-medium mb-4">
            Plans start at just $9/month.
          </p>
          <Button onClick={() => navigate('/pricing')}>
            View Paid Plans
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function LockedCourseOverlay() {
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-t-lg z-10">
      <div className="bg-white/90 rounded-full p-2.5 shadow-md mb-2">
        <Lock className="w-5 h-5 text-amber-600" />
      </div>
      <span className="text-white text-xs font-medium bg-black/50 px-2.5 py-1 rounded-full">
        Paid Plan Required
      </span>
    </div>
  );
}

export function LockedCourseBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
      <Lock className="w-3 h-3" />
      Premium
    </span>
  );
}

export function FreeTrialBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
      Free
    </span>
  );
}

export function UpgradeCallout() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
      <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        Sign up for a <button onClick={() => navigate('/pricing')} className="font-semibold underline underline-offset-2 hover:text-amber-900">paid package</button> to access this course and the full catalog.
      </p>
    </div>
  );
}
