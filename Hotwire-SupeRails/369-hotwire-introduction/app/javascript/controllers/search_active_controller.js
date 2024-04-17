import { Controller } from "@hotwired/stimulus"
import { List } from "immutable"

// Connects to data-controller="search-active"
export default class extends Controller {
  connect() {
    this.element.setAttribute("data-action", "click->search-active#clicked")
  }

  clicked() {
    // we are just adding active class to the selected post element
    // also removing active class from other post elements
    let links = document.querySelectorAll("#results a.active")
    console.log(links)
    Array.from(links).forEach(link => {
      link.classList.remove("active")
    })

    this.element.classList.add("active")
  }
}
