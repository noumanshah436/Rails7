class Address < ApplicationRecord
  validates :country, presence: true

  validates :state, inclusion: { in: ->(record) { record.states.keys }, allow_blank: true }
  validates :state, presence: { if: ->(record) { record.states.present? } }

  validates :city, inclusion: { in: ->(record) { record.cities }, allow_blank: true }
  validates :city, presence: { if: ->(record) { record.cities.present? } }

  validates :details, presence: true

  def countries
    CS.countries.with_indifferent_access
  end

  def states
    CS.states(country).with_indifferent_access
  end

  def cities
    CS.cities(state, country) || []
  end

  def country_label
    countries[country]
  end

  def state_label
    states[state]
  end
end
