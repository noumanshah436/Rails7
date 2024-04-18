import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="dialog"
export default class extends Controller {
  static targets = ["modal"]
  connect() {
  }

  open() {
    // this.modalTarget.show();
    this.modalTarget.showModal();
    document.body.classList.add("overflow-hidden")
  }

  clickOutside(event) {
    if (event.target === this.modalTarget) {
      this.modalTarget.close();
    }
  }
}


// - model occupy the whole document width
// - when we click outside of the modal content, we are actually clicking dialog
// - when we click inside dialog, we are clicking specific element of that dialog
