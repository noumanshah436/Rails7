# frozen_string_literal: true

module PostsHelper
  def construct_timeline
    Post.where('user_id IN (?) OR user_id = ? ',
               current_user.followee_ids, current_user.id)
        .order('created_at DESC')
  end
end
