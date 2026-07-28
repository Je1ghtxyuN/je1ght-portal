(function () {
  'use strict'

  var form = document.querySelector('.portal-contact-form')
  if (!form || !window.fetch) return

  var status = form.querySelector('.portal-contact-status')
  var submit = form.querySelector('.portal-contact-submit')

  form.addEventListener('submit', function (event) {
    event.preventDefault()
    status.textContent = 'Sending…'
    submit.disabled = true

    var payload = Object.fromEntries(new FormData(form).entries())
    fetch(form.action, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json().catch(function () { return {} }).then(function (body) {
            throw new Error(body.error || 'Unable to send your message.')
          })
        }
        form.reset()
        status.textContent = 'Message received. Thank you.'
      })
      .catch(function (error) {
        status.textContent = error.message
      })
      .finally(function () {
        submit.disabled = false
      })
  })
})()
