Task.destroy_all
List.destroy_all

list = List.create(name: 'TODO')
list.tasks.create(name: 'record a video')
list.tasks.create(name: 'walk my dog')
list.tasks.create(name: 'kiss my wife')
list.tasks.create(name: 'drink coffee')

list = List.create(name: 'In progress')
list = List.create(name: 'Done')
