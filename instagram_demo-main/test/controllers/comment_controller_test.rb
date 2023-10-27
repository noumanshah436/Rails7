# frozen_string_literal: true

require 'test_helper'

class CommentControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:regular)
    sign_in(@user)
    @post = posts(:one)
    @comment = @post.comments.build(body: 'Test comment')
  end

  test 'should create comment' do
    assert_difference('Comment.count') do
      post post_comments_url(comment: { body: @comment.body }, post_id: @post.id)
    end
  end
end
