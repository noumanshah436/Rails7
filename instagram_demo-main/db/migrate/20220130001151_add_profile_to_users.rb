# frozen_string_literal: true

class AddProfileToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :name, :string
    add_column :users, :bio, :text
    add_column :users, :website, :string
  end
end
