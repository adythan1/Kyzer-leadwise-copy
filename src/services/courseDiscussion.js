import { supabase, TABLES } from '@/lib/supabase'

const MAX_BODY_LENGTH = 8000

/**
 * @param {string} courseId
 * @returns {Promise<{ data: Array | null, error: string | null }>}
 */
export async function fetchCourseDiscussionPosts(courseId) {
  if (!courseId) {
    return { data: null, error: 'Missing course' }
  }

  const { data: posts, error } = await supabase
    .from(TABLES.COURSE_DISCUSSION_POSTS)
    .select('id, course_id, user_id, parent_id, body, created_at, updated_at')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message || 'Could not load discussion' }
  }

  if (!posts?.length) {
    return { data: [], error: null }
  }

  const userIds = [...new Set(posts.map((p) => p.user_id))]
  const { data: profiles } = await supabase
    .from(TABLES.PROFILES)
    .select('id, first_name, last_name, avatar_url')
    .in('id', userIds)

  const profileById = Object.fromEntries((profiles || []).map((p) => [p.id, p]))

  const enriched = posts.map((p) => ({
    ...p,
    author: profileById[p.user_id] || {
      first_name: null,
      last_name: null,
      avatar_url: null,
    },
  }))

  return { data: enriched, error: null }
}

/**
 * @param {string} courseId
 * @param {string} userId
 * @param {string} body
 * @param {string | null} parentId
 * @returns {Promise<{ data: object | null, error: string | null }>}
 */
export async function createCourseDiscussionPost(courseId, userId, body, parentId = null) {
  const trimmed = String(body || '').trim()
  if (!trimmed) {
    return { data: null, error: 'Message cannot be empty' }
  }
  if (trimmed.length > MAX_BODY_LENGTH) {
    return { data: null, error: `Keep messages under ${MAX_BODY_LENGTH} characters` }
  }

  if (parentId) {
    const { data: parent } = await supabase
      .from(TABLES.COURSE_DISCUSSION_POSTS)
      .select('id, course_id')
      .eq('id', parentId)
      .maybeSingle()

    if (!parent || parent.course_id !== courseId) {
      return { data: null, error: 'Invalid reply' }
    }
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from(TABLES.COURSE_DISCUSSION_POSTS)
    .insert({
      course_id: courseId,
      user_id: userId,
      parent_id: parentId,
      body: trimmed,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message || 'Failed to post' }
  }

  return { data, error: null }
}
