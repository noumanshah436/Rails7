# frozen_string_literal: true

class UserController < ApplicationController
  include UsersHelper
  before_action :set_friendly_user
  def show
    render 'users/show'
  end

  def follow
    Relationship.create_or_find_by(follower_id: current_user.id, followee_id: @user.id)
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(dom_id_for_follower(@user), partial: 'users/follow_button',
                                                                              locals: { user: @user })
      end
    end
  end

  def unfollow
    current_user.followed_users.where(follower_id: current_user.id, followee_id: @user.id).destroy_all
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(dom_id_for_follower(@user), partial: 'users/follow_button',
                                                                              locals: { user: @user })
      end
    end
  end

  private

  def set_friendly_user
    @user = User.friendly.find(params[:id])
  end
end
