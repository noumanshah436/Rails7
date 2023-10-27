import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="bs-modal"
export default class extends Controller {
  connect() {
    // this.element is the dom element where we added data-controller="bs-modal" attribute
    console.log("bs-modal-controller.js")
    this.modal = new bootstrap.Modal(this.element, {
      keyboard: false
    })
    this.modal.show()
  }

  disconnect() {
    this.modal.hide()
  }

  submitEnd(event) {
    this.modal.hide()
  }
}

// rails g stimulus bs_modal
