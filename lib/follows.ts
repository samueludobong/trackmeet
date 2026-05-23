import { supabase } from './supabase'

export const followUser = async (
  targetUserId: string,
): Promise<{ success?: boolean; error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.id === targetUserId) return { error: 'Cannot follow yourself' }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUserId })

  if (error) return { error: error.message }
  return { success: true }
}

export const unfollowUser = async (
  targetUserId: string,
): Promise<{ success?: boolean; error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)

  if (error) return { error: error.message }
  return { success: true }
}

export const checkIsFollowing = async (targetUserId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()

  return !!data
}
