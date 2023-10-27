# frozen_string_literal: true

class User < ApplicationRecord
  extend FriendlyId

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  has_many :comments, dependent: :destroy
  has_many :posts, dependent: :destroy
  has_many :notifications, as: :recipient

  # This access the Relationship object.
  has_many :followed_users,
           foreign_key: :follower_id,
           class_name: 'Relationship',
           dependent: :destroy

  # This accesses the user through the relationship object.
  has_many :followees, through: :followed_users, dependent: :destroy

  # This access the Relationship object.
  has_many :following_users,
           foreign_key: :followee_id,
           class_name: 'Relationship',
           dependent: :destroy

  # This accesses the user through the relationship object.
  has_many :followers, through: :following_users, dependent: :destroy

  has_one_attached :avatar

  validate :allowed_username
  validates :email, presence: true, uniqueness: true
  validates :name, presence: true
  validates :bio, length: { maximum: 500 }
  validates :website, length: { maximum: 100 }
  validates :username, presence: true, uniqueness: true, length: { minimum: 1, maximum: 20 }

  friendly_id :username, use: :slugged
  after_commit :add_default_avatar, on: %i[create update]

  def avatar_thumbnail
    avatar.variant(resize_to_limit: [150, 150]).processed
  end

  def chat_avatar
    avatar.variant(resize_to_limit: [50, 50]).processed
  end

  def nav_avatar
    avatar.variant(resize_to_limit: [25, 25]).processed
  end

  private

  def allowed_username
    deny_list = %w[explore root home posts post users user]

    errors.add(:username, 'is not allowed') if deny_list.include?(username)

    unless username.match?(/\A[a-zA-Z0-9_]+\z/)
      errors.add(:username,
                 'can only contain letters, numbers and underscores')
    end
    return if username.match?(/\A[a-zA-Z0-9_]+\z/) && !deny_list.include?(username)
  end

  def add_default_avatar
    return if avatar.attached?

    avatar.attach(
      io: File.open(Rails.root.join('app', 'assets', 'images', 'default_profile.jpg')),
      filename: 'default_profile.jpg',
      content_type: 'image/png'
    )
  end
end
