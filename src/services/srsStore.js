import { initializeDSRState, reviewDSRState } from './dsrSrsEngine';

export async function getUserTaskProgress(supabase, userId, taskId) {
  const { data, error } = await supabase
    .from('user_task_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertUserTaskProgress(supabase, userId, taskId, payload) {
  const row = {
    user_id: userId,
    task_id: taskId,
    task_type: payload.taskType || 'quiz',
    category: payload.category || null,
    due_date: payload.dueDate,
    difficulty: payload.difficulty,
    stability: payload.stability,
    retrievability: payload.retrievability,
    desired_retention: payload.desiredRetention,
    review_count: payload.reviewCount,
    lapse_count: payload.lapseCount,
    elapsed_days: payload.elapsedDays,
    scheduled_days: payload.scheduledDays,
    last_rating: payload.lastRating,
    last_outcome: payload.lastOutcome,
    last_reviewed_at: payload.lastReviewedAt,
    metadata: payload.metadata || {},
  };

  const { error } = await supabase
    .from('user_task_progress')
    .upsert([row], { onConflict: 'user_id,task_id' });

  if (error) throw error;
  return row;
}

export async function reviewTaskWithDSR({
  supabase,
  userId,
  taskId,
  rating,
  taskType = 'quiz',
  category = null,
  reviewedAt = new Date(),
  desiredRetention = 0.9,
  metadata = {},
}) {
  const existing = await getUserTaskProgress(supabase, userId, taskId);

  const previousState = existing
    ? {
        difficulty: existing.difficulty,
        stability: existing.stability,
        retrievability: existing.retrievability,
        desiredRetention: existing.desired_retention,
        reviewCount: existing.review_count,
        lapseCount: existing.lapse_count,
        elapsedDays: existing.elapsed_days,
        scheduledDays: existing.scheduled_days,
        lastRating: existing.last_rating,
        lastOutcome: existing.last_outcome,
        lastReviewedAt: existing.last_reviewed_at,
        dueDate: existing.due_date,
      }
    : initializeDSRState(new Date(reviewedAt).getTime(), { desiredRetention });

  const nextState = reviewDSRState(previousState, {
    rating,
    reviewedAt,
    taskId,
    config: { desiredRetention },
  });

  const persisted = await upsertUserTaskProgress(supabase, userId, taskId, {
    ...nextState,
    taskType,
    category,
    metadata,
  });

  return {
    previousState,
    nextState,
    persisted,
  };
}

export async function getDueTasksForToday(supabase, userId, {
  limit = 100,
  taskTypes = null,
  now = new Date(),
} = {}) {
  let query = supabase
    .from('user_task_progress')
    .select('*')
    .eq('user_id', userId)
    .lte('due_date', now.toISOString())
    .order('due_date', { ascending: true })
    .limit(limit);

  if (Array.isArray(taskTypes) && taskTypes.length > 0) {
    query = query.in('task_type', taskTypes);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getTaskProgressByType(supabase, userId, taskType) {
  if (!userId || !taskType) return [];

  const { data, error } = await supabase
    .from('user_task_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('task_type', taskType);

  if (error) throw error;
  return data || [];
}

export async function clearTaskProgressByType(supabase, userId, taskType) {
  if (!userId || !taskType) return;

  const { error } = await supabase
    .from('user_task_progress')
    .delete()
    .eq('user_id', userId)
    .eq('task_type', taskType);

  if (error) throw error;
}
