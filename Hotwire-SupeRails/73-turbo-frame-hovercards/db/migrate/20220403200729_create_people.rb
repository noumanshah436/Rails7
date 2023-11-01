class CreatePeople < ActiveRecord::Migration[7.0]
  def change
    create_table :people do |t|
      t.string :first_name
      t.string :last_name
      t.string :address
      t.string :phone
      t.datetime :date_of_birth

      t.timestamps
    end
  end
end
