import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log("debounce controller connected")
  }

  static targets = ["form"]

  search() {
    // clearing any previously set timeouts to avoid concurrent search requests
    clearTimeout(this.timeout)

    this.timeout = setTimeout(() => {
      this.formTarget.requestSubmit()
    }, 500)
  }
}

//  It sets a new timeout using setTimeout. The function provided as the first argument to setTimeout is executed after a delay of 500 milliseconds (0.5 seconds).

// Inside this function, this.formTarget.requestSubmit() is called.

// this.formTarget references the DOM element associated with the "form" target defined earlier.

// requestSubmit() is a method that submits the form.

// So, this code effectively introduces a 500-millisecond delay before submitting the form, acting as a debounce mechanism for search requests.

// Debouncing is a technique used in web development to control the rate at which a function is executed,
//  typically in response to user input, to prevent it from being called too frequently

// ********************************

// submit vs requestSubmit in javascript:
// https://funwithforms.com/posts/submit-vs-requestsubmit/

// In case of submit(), suppose input field has require attribute and you submit the form with empty field,
//  the form will however still be submitted, because submit() doesn't care about validation

// If you use form.requestSubmit() instead of form.submit() the form will only be submitted if it is valid
// If you leave the input field empty the browser will show a hint to the user that they have to fill out that field and the form will not be submitted.

// ********************************
