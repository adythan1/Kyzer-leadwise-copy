import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';

const PLAN_HIERARCHY = {
  free_trial: 0,
  starter: 1,
  pro: 2,
  premium: 3,
};

export function useSubscription() {
  const { profile, user } = useAuth();

  const subscription = useMemo(() => {
    if (!user) {
      return {
        plan: null,
        isFreeTrial: false,
        isCorporate: false,
        isAuthenticated: false,
        canAccessCourse: () => false,
        canAccessAssessments: () => false,
        canAccessCertificates: () => false,
      };
    }

    const plan = profile?.subscription_plan || 'free_trial';
    const isFreeTrial = plan === 'free_trial';
    const planLevel = PLAN_HIERARCHY[plan] ?? 0;
    const userOrgId = profile?.organization_id;
    const isCorporate = !!userOrgId;

    const isOwnOrgCourse = (course) =>
      isCorporate && course?.restricted_organization_id && course.restricted_organization_id === userOrgId;

    const canAccessCourse = (course) => {
      if (!course) return false;
      if (isOwnOrgCourse(course)) return true;
      if (planLevel >= PLAN_HIERARCHY.starter) return true;
      return !!course.is_free_trial;
    };

    const canAccessAssessments = (course) => {
      if (!course) return false;
      if (isOwnOrgCourse(course)) return true;
      if (planLevel >= PLAN_HIERARCHY.starter) return true;
      return false;
    };

    const canAccessCertificates = (course) => {
      if (!course) return false;
      if (isOwnOrgCourse(course)) return true;
      if (planLevel >= PLAN_HIERARCHY.starter) return true;
      return false;
    };

    return {
      plan,
      isFreeTrial,
      isCorporate,
      isAuthenticated: true,
      isPaid: planLevel >= PLAN_HIERARCHY.starter,
      planLevel,
      canAccessCourse,
      canAccessAssessments,
      canAccessCertificates,
    };
  }, [user, profile?.subscription_plan, profile?.organization_id]);

  return subscription;
}
