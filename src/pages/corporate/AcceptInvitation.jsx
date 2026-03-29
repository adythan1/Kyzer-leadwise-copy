// src/pages/corporate/AcceptInvitation.jsx
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  Building2, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Mail,
  UserCheck,
  ArrowRight,
  Clock
} from 'lucide-react'
import { useCorporateStore } from '@/store/corporateStore'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PageTitle from '@/components/layout/PageTitle'

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuthStore()
  const { acceptInvitation, loading, error } = useCorporateStore()
  
  const [invitationData, setInvitationData] = useState(null)
  const [acceptanceStatus, setAcceptanceStatus] = useState('loading') // loading, ready, accepting, success, error
  
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setAcceptanceStatus('error')
      return
    }

    if (!authLoading) {
      if (!user) {
        // Redirect to login with return URL
        navigate(`/login?return=${encodeURIComponent(window.location.pathname + window.location.search)}`)
        return
      }

      // Validate invitation token
      validateInvitation()
    }
  }, [token, user, authLoading, navigate])

  const validateInvitation = async () => {
    try {
      // In a real app, you'd validate the token without accepting it first
      // For now, we'll simulate fetching invitation details
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock invitation data - in real app, fetch this from your API
      const mockInvitation = {
        id: '123',
        email: user.email,
        company: {
          name: 'Acme Corporation',
          domain: 'acme.com',
          industry: 'Technology',
          employee_count: 45
        },
        role: 'employee',
        invited_by: {
          name: 'John Smith',
          email: 'john@acme.com'
        },
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }

      setInvitationData(mockInvitation)
      setAcceptanceStatus('ready')
    } catch {
      setAcceptanceStatus('error')
    }
  }

  const handleAcceptInvitation = async () => {
    setAcceptanceStatus('accepting')
    
    try {
      await acceptInvitation(token)
      setAcceptanceStatus('success')
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)
    } catch {
      setAcceptanceStatus('error')
    }
  }

  const handleDeclineInvitation = () => {
    // In a real app, you might want to track declined invitations
    navigate('/')
  }

  if (authLoading || acceptanceStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-text-light mt-4">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (acceptanceStatus === 'error' || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light px-4">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-error-default mx-auto mb-4" />
            <PageTitle
              align="center"
              title="Invalid Invitation"
              subtitle="This invitation link is invalid or has expired. Please contact your company administrator for a new invitation."
              subtitleWrapperClassName="text-text-light mb-6"
            />
            <div className="space-y-3">
              <Button onClick={() => navigate('/')} className="w-full">
                Go to Homepage
              </Button>
              <Button variant="ghost" onClick={() => navigate('/contact')} className="w-full">
                Contact Support
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (acceptanceStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light px-4">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success-default" />
            </div>
            <PageTitle
              align="center"
              title="Welcome to the Team!"
              subtitle={`You've successfully joined ${invitationData?.company?.name}. You'll be redirected to your dashboard shortly.`}
              subtitleWrapperClassName="text-text-light mb-6"
            />
            <div className="space-y-3">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                <ArrowRight className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 text-primary-default mx-auto mb-4" />
          <PageTitle
            align="center"
            title="Company Invitation"
            subtitle="You've been invited to join a corporate learning platform"
          />
        </div>

        {/* Invitation Details */}
        {invitationData && (
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary-light rounded-lg flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary-default" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-text-dark">
                    {invitationData.company.name}
                  </h2>
                  <p className="text-text-light">{invitationData.company.industry}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-text-muted" />
                    <div>
                      <p className="text-sm text-text-light">Invited Email</p>
                      <p className="font-medium text-text-dark">{invitationData.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-text-muted" />
                    <div>
                      <p className="text-sm text-text-light">Role</p>
                      <p className="font-medium text-text-dark capitalize">{invitationData.role}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-text-muted" />
                    <div>
                      <p className="text-sm text-text-light">Team Size</p>
                      <p className="font-medium text-text-dark">{invitationData.company.employee_count} employees</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-text-muted" />
                    <div>
                      <p className="text-sm text-text-light">Expires</p>
                      <p className="font-medium text-text-dark">
                        {new Date(invitationData.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background-light rounded-lg">
                <p className="text-sm text-text-medium">
                  <span className="font-medium">{invitationData.invited_by.name}</span> ({invitationData.invited_by.email}) 
                  invited you to join their company's learning platform on {new Date(invitationData.created_at).toLocaleDateString()}.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* What You'll Get */}
        <Card className="mb-6">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-text-dark mb-4">What you'll get access to:</h3>
            <div className="space-y-3">
              {[
                'Access to company-assigned courses and training materials',
                'Track your learning progress and achievements',
                'Earn certificates upon course completion',
                'Collaborate with your team members',
                'Get insights from detailed progress reports'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success-default flex-shrink-0" />
                  <p className="text-text-dark">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleAcceptInvitation}
                disabled={loading || acceptanceStatus === 'accepting'}
                className="flex-1"
              >
                {acceptanceStatus === 'accepting' ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={handleDeclineInvitation}
                disabled={loading || acceptanceStatus === 'accepting'}
                className="flex-1"
              >
                Decline
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-error-light border border-error-default rounded-lg">
                <p className="text-error-default text-sm">{error}</p>
              </div>
            )}

            <div className="mt-4 p-4 bg-warning-light border border-warning-default rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning-default flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-warning-default mb-1">Important Note</h4>
                  <p className="text-sm text-warning-default">
                    By accepting this invitation, you'll be joining {invitationData?.company?.name}'s corporate account. 
                    Your learning progress and activity will be visible to company administrators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-text-light">
            Need help? <button className="text-primary-default hover:underline">Contact Support</button>
          </p>
        </div>
      </div>
    </div>
  )
}