import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["itemList", "item", "input", "addButton"];
  static values = { count: Number };
  static classes = ["completed"];

  // Connects to data-controller="todo"
  connect() {
    console.log("connected")
    console.log(this.countValue)
    console.log(this.completedClass)
    console.log(this.itemTargets)
  }

  add() {
    const newItemText = this.inputTarget.value;
    const newItem = document.createElement("li");
    newItem.setAttribute("data-action", "click->todo#toggleCompleted");
    newItem.setAttribute("data-todo-target", "item");
    
    newItem.textContent = newItemText;
    this.itemListTarget.appendChild(newItem);
    this.inputTarget.value = "";
    this.countValue++;
    console.log(this.countValue)
  }

  toggleCompleted(event) {
    const item = event.currentTarget;
    item.classList.toggle(this.completedClass);
  }
}
