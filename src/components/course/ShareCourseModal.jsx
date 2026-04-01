// src/components/course/ShareCourseModal.jsx
import { useState } from 'react'
import {
  Share2,
  Copy,
  Twitter,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Check
} from 'lucide-react'
import { Modal } from '@/components/ui'
import { useToast } from '@/components/ui'
import Button from '@/components/ui/Button'

export default function ShareCourseModal({ isOpen, onClose, course }) {
  const { success, error: showError } = useToast()
  const [copied, setCopied] = useState(false)

  if (!course) return null

  const courseUrl = `${window.location.origin}/share/course/${course.id}`
  const shareText = `Check out this course: ${course.title}`
  const shareTitle = course.title
  const shareDescription = course.description || course.subtitle || ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(courseUrl)
      setCopied(true)
      success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showError('Failed to copy link')
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const payload = { title: shareTitle, url: courseUrl }
        if (navigator.canShare && !navigator.canShare(payload)) {
          handleCopyLink()
          return
        }
        await navigator.share(payload)
        success('Course shared successfully!')
      } catch (err) {
        if (err.name !== 'AbortError') {
          showError('Failed to share course')
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const shareOptions = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      color: 'text-blue-400',
      bgColor: 'hover:bg-blue-50',
      action: () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(courseUrl)}`
        window.open(url, '_blank', 'noopener,noreferrer')
        success('Opening Twitter...')
      }
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600',
      bgColor: 'hover:bg-blue-50',
      action: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(courseUrl)}&quote=${encodeURIComponent(shareText)}`
        window.open(url, '_blank', 'noopener,noreferrer')
        success('Opening Facebook...')
      }
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'text-blue-700',
      bgColor: 'hover:bg-blue-50',
      action: () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(courseUrl)}`
        window.open(url, '_blank', 'noopener,noreferrer')
        success('Opening LinkedIn...')
      }
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-600',
      bgColor: 'hover:bg-green-50',
      action: () => {
        const url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${courseUrl}`)}`
        window.open(url, '_blank', 'noopener,noreferrer')
        success('Opening WhatsApp...')
      }
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      color: 'text-gray-600',
      bgColor: 'hover:bg-gray-50',
      action: () => {
        const subject = encodeURIComponent(`Check out this course: ${shareTitle}`)
        const body = encodeURIComponent(`${shareText}\n\n${shareDescription}\n\n${courseUrl}`)
        const url = `mailto:?subject=${subject}&body=${body}`
        window.location.href = url
        success('Opening email client...')
      }
    }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Course" size="md">
      <div className="space-y-6">
        {/* Course Info */}
        <div className="border-b border-background-light pb-4">
          <h3 className="font-semibold text-text-dark mb-1">{course.title}</h3>
          {course.subtitle && (
            <p className="text-sm text-text-light line-clamp-2">{course.subtitle}</p>
          )}
        </div>

        {/* Copy Link Section */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Course Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={courseUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-background-dark rounded-lg bg-background-light text-text-dark text-sm"
            />
            <Button
              onClick={handleCopyLink}
              variant={copied ? 'secondary' : 'primary'}
              size="sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Native Share (Mobile) */}
        {navigator.share && (
          <div>
            <Button
              onClick={handleNativeShare}
              className="w-full"
              size="lg"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share via...
            </Button>
          </div>
        )}

        {/* Social Media Options */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-3">
            Share on Social Media
          </label>
          <div className="grid grid-cols-2 gap-3">
            {shareOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  onClick={option.action}
                  className={`
                    flex items-center gap-3 p-3 border border-background-dark rounded-lg
                    transition-colors ${option.bgColor}
                    hover:border-primary-default
                  `}
                >
                  <Icon className={`w-5 h-5 ${option.color}`} />
                  <span className="text-sm font-medium text-text-dark">{option.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-background-light">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

