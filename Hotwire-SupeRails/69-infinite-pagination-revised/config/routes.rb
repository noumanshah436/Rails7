Rails.application.routes.draw do
  resources :artists
  root "posts#index"
  resources :posts
  resources :comments do
    collection do
      post :index
    end
  end
end
