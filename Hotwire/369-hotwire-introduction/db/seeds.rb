# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: "Star Wars" }, { name: "Lord of the Rings" }])
#   Character.create(name: "Luke", movie: movies.first)
100.times do
  Post.find_or_create_by(title: Faker::Quote.famous_last_words) do |post|
    post.content = Faker::Lorem.paragraph(
      sentence_count: 64,
      supplemental: true,
      random_sentences_to_add: 4
    )
  end
end