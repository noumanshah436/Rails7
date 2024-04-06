import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="dropdown"
export default class extends Controller {
  static targets = ["dropdownContent", "openButton", "closeButton", "active"]
  static values = { open: Boolean }
  static classes = ["opened"]

  connect() {
    if (this.openValue) {
      this.openDropdown()
    } else {
      this.closeDropdown()
    }
    // this.dropdownContentTarget.hidden = true
    // this.closeButtonTarget.hidden = true
    // console.log("hello")
  }

  toggleDropdown() {
    if (this.dropdownContentTarget.hidden == true) {
      this.openDropdown()
    } else {
      this.closeDropdown()
    }
  }

  openDropdown() {
    this.dropdownContentTarget.hidden = false
    try {
    this.openButtonTarget.hidden = true
    this.closeButtonTarget.hidden = false } catch {}
    try {
      // this.activeTarget.classList.add("bg-zinc-400")
      this.activeTarget.classList.add(this.openedClass)
    } catch {}
  }

  closeDropdown() {
    this.dropdownContentTarget.hidden = true
    try {
    this.openButtonTarget.hidden = false
    this.closeButtonTarget.hidden = true } catch {}
    try {
      // this.activeTarget.classList.remove("bg-zinc-400")
      this.activeTarget.classList.remove(this.openedClass)
    } catch {}
  }

}
