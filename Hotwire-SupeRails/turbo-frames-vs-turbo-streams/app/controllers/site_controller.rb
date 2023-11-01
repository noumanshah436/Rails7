class SiteController < ApplicationController

  # http://localhost:3000/turbo_frame_example
  def turbo_frame_example
  end

  def example_page
  end

  # http://localhost:3000/turbo_stream_example
  def turbo_stream_example
  end

  def first
  end

  def second
  end

  def third
  end

  def fourth
    # this will update the content div through the mystr stream
    # Turbo::StreamsChannel.broadcast_update_to("mystr", target: "content", partial: "site/the_stuff")
    Turbo::StreamsChannel.broadcast_update_to("mystr", target: "content", html: "nouman")
  end
end
