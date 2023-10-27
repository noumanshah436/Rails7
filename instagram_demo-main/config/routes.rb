# frozen_string_literal: true

Rails.application.routes.draw do
  devise_for :users, controllers: {
    registrations: 'users/registrations',
    sessions: 'users/sessions'
  }
  get '/explore', to: 'posts#explore'
  resources :posts do
    resources :comments
  end
  root 'posts#index'
  match ':id', to: 'user#show', via: :get, as: :user
  post 'user/follow', to: 'user#follow'
  delete 'user/unfollow', to: 'user#unfollow'
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
