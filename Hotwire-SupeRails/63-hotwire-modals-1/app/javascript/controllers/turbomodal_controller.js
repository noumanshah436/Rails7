import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="turbomodal"
export default class extends Controller {
  connect() {
  }

  // hide modal on successful form submission
  // action: "turbo:submit-end->turbomodal#submitEnd"
  submitEnd(e) {
    if (e.detail.success) {
      this.hideModal()
    }
  }

  hideModal() {
    this.element.remove()
  }
}
