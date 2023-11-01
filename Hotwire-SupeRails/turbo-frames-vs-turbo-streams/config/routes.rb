Rails.application.routes.draw do
  get '/turbo_frame_example', to: "site#turbo_frame_example", as: :turbo_frame_example_page
  get '/example_page', to: "site#example_page", as: :example_page
  get '/turbo_stream_example', to: "site#turbo_stream_example", as: :turbo_stream_example_page
  get '/first', to: "site#first", as: :first_page
  get '/second', to: "site#second", as: :second_page
  post '/third', to: "site#third", as: :third_page
  post '/fourth', to: "site#fourth", as: :fourth_page
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "site#turbo_frame_example"
  root "site#first"
end
