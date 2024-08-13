define([`@entrypoint@`], m => {
  return function () {
    return m.default(this)
  }
})


console.log('test')

console.error('test')
