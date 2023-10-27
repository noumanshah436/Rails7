# frozen_string_literal: true

class CommentsController < ApplicationController
  before_action :authenticate_user!
  def create
    @post = Post.find(params[:post_id])
    @comment = @post.comments.build(comment_params)
    @comment.user = current_user

    if @comment.save
      notify_post_creator
      flash[:notice] = 'Comment has been created.'
    else
      flash[:alert] = 'Comment has not been created!'
    end
    redirect_to @post
  end

  private

  def comment_params
    params.require(:comment).permit(:body)
  end

  def notify_post_creator
    CommentNotification.with(post: @post).deliver(@post.user) if @comment.user != @post.user
  end
end
