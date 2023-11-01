Rails.application.routes.draw do
  resources :people do
    member do
      get :hovercard
    end
  end
  root to: redirect("/people")
end
