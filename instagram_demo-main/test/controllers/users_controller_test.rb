# frozen_string_literal: true

require 'test_helper'

class UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:regular)
    sign_in(@user)
  end

  def test_avatar
    avatar = users(:regular).avatar

    assert avatar.attached?
    assert_not_nil avatar.download
    assert_equal 219_542, avatar.byte_size
  end

  test 'should have a profile' do
    get user_url(@user)
    assert_response :success
  end
end
