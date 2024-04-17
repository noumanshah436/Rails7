import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="search"
export default class extends Controller {
  connect() {
    // we can add data-action on element in erb file, but this is good to keep it here
    this.element.setAttribute("data-action", "keyup->search#search")
  }

  search() {
    let params = new URLSearchParams()
    params.append("query", this.element.value)

    fetch(`/?${params}`, {
      method: "GET",
      headers: {
        Accept: "text/vnd.turbo-stream.html"
      }
    })
      .then(r => r.text())
      .then(html => Turbo.renderStreamMessage(html))
  }
}
