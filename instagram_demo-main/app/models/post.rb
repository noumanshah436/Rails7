# frozen_string_literal: true

class Post < ApplicationRecord
  belongs_to :user
  has_many :comments, dependent: :destroy
  validates :body, presence: true, length: { minimum: 10 }

  has_noticed_notifications model_name: 'Notification'

  has_many_attached :images

  def navbar_image
    return '/assets/default_profile.jpg' unless images.attached?

    images[0].variant(resize_to_limit: [25, 25]).processed
  end

  def thumbnail_image
    images[0].variant(resize_to_limit: [500, 500]).processed
  end
end
