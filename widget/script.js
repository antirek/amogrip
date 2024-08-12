define([`@entrypoint@`], m => {
  return function () {
    return m.default(this)
  }
})
