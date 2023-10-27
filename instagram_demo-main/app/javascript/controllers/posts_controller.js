import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  connect() {
    console.log("Connected");
  }

  view(e) {
    console.log(this);
    document
      .getElementById("posts_section")
      .insertAdjacentHTML("afterbegin", this.template());
  }
}
