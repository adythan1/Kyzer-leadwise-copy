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

  return (
    <div className={depth > 0 ? 'ml-4 sm:ml-8 pl-4 border-l-2 border-background-dark' : ''}>
      <div className="flex gap-3 py-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-background-medium flex items-center justify-center overflow-hidden">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2 mb-1">
            <span className="font-medium text-text-dark text-sm">
              {authorDisplayName(post.author)}
            </span>
            <span className="text-xs text-text-light">
              {new Date(post.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-text-medium whitespace-pre-wrap break-words">{post.body}</p>
          {userId && depth < 4 && (
            <button
              type="button"
              onClick={() => setShowReply((s) => !s)}
              className="mt-2 text-xs font-medium text-primary-default hover:text-primary-dark"
            >
              {showReply ? 'Cancel' : 'Reply'}
            </button>
          )}
          {showReply && userId && (
            <div className="mt-3 space-y-2">
              <textarea
                className="w-full min-h-[72px] p-3 text-sm border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default outline-none resize-y"
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={submitting}
              />
              <Button size="sm" onClick={handleSubmitReply} disabled={submitting || !replyText.trim()}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                Post reply
              </Button>
            </div>
          )}
        </div>
      </div>
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
      <Card className="p-6">
        <p className="text-text-medium">Sign in to view and join the course community.</p>
      </Card>
    )
  }

  if (!isEnrolled) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-8 h-8 text-primary-default flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-text-dark mb-1">Course community</h3>
            <p className="text-sm text-text-light">
              Enroll in this course to connect with other learners in the discussion forum.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-6 h-6 text-primary-default" />
        <h2 className="text-xl font-bold text-text-dark">Course community</h2>
      </div>
      <p className="text-sm text-text-light mb-6">
        Discuss topics with others who are taking this course. Be respectful and on-topic.
      </p>

      {userId && (
        <div className="mb-8 space-y-3">
          <label htmlFor="course-discussion-new" className="sr-only">
            New discussion post
          </label>
          <textarea
            id="course-discussion-new"
            className="w-full min-h-[100px] p-4 text-sm border border-background-dark rounded-lg focus:ring-2 focus:ring-primary-default focus:border-primary-default outline-none resize-y"
            placeholder="Start a conversation…"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Button onClick={handleNewPost} disabled={submitting || !newPost.trim()}>
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
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : rootPosts.length === 0 ? (
        <p className="text-center text-text-light py-8 text-sm">No messages yet. Start the conversation above.</p>
      ) : (
        <div className="divide-y divide-background-dark border border-background-dark rounded-lg overflow-hidden bg-background-light/30">
          {rootPosts.map((p) => (
            <div key={p.id} className="px-4 bg-white">
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
