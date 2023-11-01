5.times do
  Person.create(first_name: Faker::Name.first_name,
                last_name: Faker::Name.last_name,
                address: Faker::Address.full_address,
                phone: Faker::PhoneNumber.cell_phone,
                date_of_birth: Faker::Date.birthday(min_age: 18, max_age: 65))
end