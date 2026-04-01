import { useState, useEffect, useCallback, useMemo } from 'react'
import { MessageCircle, Send, Loader2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  fetchCourseDiscussionPosts,
  createCourseDiscussionPost,
} from '@/services/courseDiscussion'

function authorDisplayName(author) {
  if (!author) return 'Learner'
  const parts = [author.first_name, author.last_name].filter(Boolean)
  if (parts.length) return parts.join(' ')
  return 'Learner'
}

/** Shorter, locale-aware date/time for thread headers */
function formatPostTimestamp(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString()
  }
}

function buildPostTree(flatPosts) {
  const byParent = new Map()
  for (const p of flatPosts) {
    const key = p.parent_id || '__root__'
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(p)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }
  return byParent.get('__root__') || []
}

const composerInputClass =
  'w-full min-h-[100px] p-4 text-sm text-text-dark rounded-xl border border-background-dark bg-background-white ' +
  'placeholder:text-text-muted shadow-inner shadow-black/[0.02] ' +
  'focus:ring-2 focus:ring-primary-default/35 focus:border-primary-default outline-none resize-y transition-shadow'

const replyInputClass =
  'w-full min-h-[72px] p-3 text-sm text-text-dark rounded-lg border border-background-dark bg-background-white ' +
  'placeholder:text-text-muted focus:ring-2 focus:ring-primary-default/35 focus:border-primary-default outline-none resize-y'

function DiscussionThread({ post, repliesByParent, depth, onReply, userId, submitting }) {
  const replies = repliesByParent.get(post.id) || []
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return
    await onReply(post.id, replyText)
    setReplyText('')
    setShowReply(false)
  }

  const isNested = depth > 0
  const avatarSm = isNested ? 'w-8 h-8' : 'w-10 h-10'
  const indentClass = isNested
    ? 'mt-3 ml-2 pl-3 sm:ml-3 sm:pl-4 border-l-2 border-primary-default/35'
    : ''

  return (
    <div className={indentClass}>
      <div className={`flex gap-3 ${isNested ? 'pt-1' : 'py-1'}`}>
        <div
          className={`flex-shrink-0 ${avatarSm} rounded-full bg-gradient-to-br from-background-light to-background-medium flex items-center justify-center overflow-hidden ring-2 ring-background-white shadow-sm`}
        >
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className={`${isNested ? 'w-4 h-4' : 'w-5 h-5'} text-text-muted`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
            <span className="font-semibold text-text-dark text-sm sm:text-base">
              {authorDisplayName(post.author)}
            </span>
            <time
              className="text-xs font-medium text-gray-600 dark:text-gray-400 tabular-nums"
              dateTime={post.created_at}
            >
              {formatPostTimestamp(post.created_at)}
            </time>
          </div>
          <p className="text-sm sm:text-[0.9375rem] text-text-dark leading-relaxed whitespace-pre-wrap break-words">
            {post.body}
          </p>
          {userId && depth < 4 && (
            <button
              type="button"
              onClick={() => setShowReply((s) => !s)}
              className="mt-2.5 text-sm font-semibold text-primary-default hover:text-primary-dark underline-offset-4 hover:underline"
            >
              {showReply ? 'Cancel' : 'Reply'}
            </button>
          )}
          {showReply && userId && (
            <div className="mt-3 space-y-2 rounded-lg bg-background-light/60 p-3 border border-background-dark/40">
              <textarea
                className={replyInputClass}
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={submitting}
              />
              <Button size="sm" variant="primary" onClick={handleSubmitReply} disabled={submitting || !replyText.trim()}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                Post reply
              </Button>
            </div>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <div className="space-y-1">
          {replies.map((r) => (
            <DiscussionThread
              key={r.id}
              post={r}
              repliesByParent={repliesByParent}
              depth={depth + 1}
              onReply={onReply}
              userId={userId}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PanelHeader() {
  return (
    <div className="flex items-start gap-3 sm:gap-4 pb-6 mb-6 border-b border-background-dark/50">
      <div
        className="rounded-xl bg-primary-light p-2.5 text-primary-default shrink-0 shadow-sm ring-1 ring-primary-default/15"
        aria-hidden
      >
        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
      </div>
      <div className="min-w-0 space-y-1">
        <h2 className="text-lg sm:text-xl font-bold text-text-dark tracking-tight">Course community</h2>
        <p className="text-sm text-text-medium leading-snug max-w-2xl">
          Discuss topics with others who are taking this course. Be respectful and on-topic.
        </p>
      </div>
    </div>
  )
}

/**
 * Course-scoped forum for enrolled learners (backed by course_discussion_posts + RLS).
 */
export default function CourseDiscussionPanel({ courseId, userId, isEnrolled }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadPosts = useCallback(async () => {
    if (!courseId || !isEnrolled) {
      setPosts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await fetchCourseDiscussionPosts(courseId)
    if (error) {
      toast.error(error)
      setPosts([])
    } else {
      setPosts(data || [])
    }
    setLoading(false)
  }, [courseId, isEnrolled])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const repliesByParent = useMemo(() => {
    const m = new Map()
    for (const p of posts) {
      if (!p.parent_id) continue
      if (!m.has(p.parent_id)) m.set(p.parent_id, [])
      m.get(p.parent_id).push(p)
    }
    for (const list of m.values()) {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }
    return m
  }, [posts])

  const rootPosts = useMemo(() => buildPostTree(posts), [posts])

  const handleNewPost = async () => {
    if (!userId || !newPost.trim()) return
    setSubmitting(true)
    const { error } = await createCourseDiscussionPost(courseId, userId, newPost, null)
    setSubmitting(false)
    if (error) {
      toast.error(error)
      return
    }
    setNewPost('')
    toast.success('Posted')
    await loadPosts()
  }

  const handleReply = async (parentId, body) => {
    if (!userId) return
    setSubmitting(true)
    const { error } = await createCourseDiscussionPost(courseId, userId, body, parentId)
    setSubmitting(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Reply posted')
    await loadPosts()
  }

  if (!userId) {
    return (
      <Card className="p-6 sm:p-8 overflow-hidden">
        <PanelHeader />
        <p className="text-text-medium text-sm sm:text-base">Sign in to view and join the course community.</p>
      </Card>
    )
  }

  if (!isEnrolled) {
    return (
      <Card className="p-6 sm:p-8 overflow-hidden">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="rounded-xl bg-primary-light p-2.5 text-primary-default shrink-0 shadow-sm ring-1 ring-primary-default/15"
            aria-hidden
          >
            <MessageCircle className="w-6 h-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-text-dark text-lg">Course community</h3>
            <p className="text-sm text-text-medium leading-snug">
              Enroll in this course to connect with other learners in the discussion forum.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 sm:p-8 overflow-hidden shadow-sm">
      <PanelHeader />

      {userId && (
        <div className="mb-8 rounded-xl border border-primary-default/20 bg-gradient-to-br from-primary-light/40 to-background-light/80 dark:from-primary-default/10 dark:to-background-light/30 p-4 sm:p-5 space-y-3 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/5">
          <label htmlFor="course-discussion-new" className="sr-only">
            New discussion post
          </label>
          <textarea
            id="course-discussion-new"
            className={composerInputClass}
            placeholder="Start a conversation…"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleNewPost} disabled={submitting || !newPost.trim()}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : rootPosts.length === 0 ? (
        <div className="text-center py-14 px-4 rounded-xl border border-dashed border-background-dark bg-background-light/40">
          <MessageCircle className="w-10 h-10 mx-auto text-text-muted mb-3 opacity-80" strokeWidth={1.5} />
          <p className="text-text-dark font-medium text-sm sm:text-base">No messages yet</p>
          <p className="text-text-light text-sm mt-1">Start the conversation using the box above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rootPosts.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-background-dark/55 bg-background-white shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] px-4 py-4 sm:px-5 sm:py-5 transition-colors hover:border-primary-default/25"
            >
              <DiscussionThread
                post={p}
                repliesByParent={repliesByParent}
                depth={0}
                onReply={handleReply}
                userId={userId}
                submitting={submitting}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
