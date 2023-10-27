import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="bs-modal-form"
export default class extends Controller {
  connect() {
    console.log('I am connected (bs-modal-form)');
  }

  initialize() {
    // console.log(this.element);
    this.element.setAttribute('data-action', "click->bs-modal-form#showModal")
  }

  showModal(event) {
    event.preventDefault()
    this.url = this.element.getAttribute('href')
    fetch(this.url, {
      headers: {
        // indicate the desired response format when interacting with Turbo Streams.
        Accept: "text/vnd.turbo-stream.html"
      }
    })
    .then(response => response.text())
    .then(html => Turbo.renderStreamMessage(html))
  }
}
