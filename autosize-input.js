(function () {
  // Compile and cache the needed regular expressions.
  var SPACE = /\s/g
  var LESS_THAN = />/g
  var MORE_THAN = /</g

  var GHOST_ELEMENT_ID = '__autosize-input_ghost'

  // We need to swap out these characters with their character-entity
  // equivalents because we're assigning the resulting string to
  // `ghost.innerHTML`.
  function escape (str) {
    return str.replace(SPACE, '&nbsp;')
              .replace(LESS_THAN, '&lt;')
              .replace(MORE_THAN, '&gt;')
  }

  var GHOST_STYLES = [
    'box-sizing:content-box;',
    'display:inline-block;',
    'height:0;',
    'overflow:hidden;',
    'position:absolute;',
    'top:0;',
    'visibility:hidden;',
    'white-space:nowrap;'
  ].join('')

  /* eslint-disable */
  var isBrowser = new Function(
    'try { return this===window; } catch(e) { return false; }'
  )
  /* eslint-enable */

  // Create the `ghost` element, with inline styles to hide it and ensure
  // that the text is all on a single line.
  function createGhostElement () {
    var ghost = document.createElement('div')
    ghost.id = GHOST_ELEMENT_ID
    ghost.style.cssText = GHOST_STYLES
    document.body.appendChild(ghost)
    return ghost
  }

  var getGhostElement = (function () {
    var ghost = isBrowser() ? createGhostElement() : null
    var isInvalidEnvironemnt = !isBrowser()

    return function () {
      if (isInvalidEnvironemnt) {
        throw new Error('autosize-input must be used in a browser environment.')
      }
      if (document.getElementById(GHOST_ELEMENT_ID) === null) {
        ghost = createGhostElement()
      }
      return ghost
    }
  })()

  var AutoSizer = {
    elementStylesAffectingWidth: null,
    disableAuto: false,

    init: function (options) {
      options = options || {}
      this.minWidth = options.minWidth
      this.disableAuto = options.disableAuto

      // We need an explicit reference ('self') to our AutoSizer instance, as
      // 'addEventListener' rebinds callbacks to the DOM element. We also need
      // a reference to the callback, so we can pass it to 'removeEventListener'.
      var self = this
      this.resize = function (str) { self._resize(str) }
      this.resizeHandler = function () { self._resize() }
    },

    _resize: function (str) {
      var element = this.element
      str = str || element.value || element.getAttribute('placeholder') || ''

      // Determine the proper width by setting the innerHTML of our ghost <div>
      // to the text from our input element. This works because the ghost <div>
      // is styled with 'display: inline-block;'
      var ghost = getGhostElement()
      ghost.style.cssText += this.elementStylesAffectingWidth
      ghost.innerHTML = escape(str)
      var udpatedWidth = window.getComputedStyle(ghost).width

      // update the input element with the calculated width
      element.style.width = udpatedWidth
      return udpatedWidth
    },

    getTextValue: function () {
      return this.element ? this.element.value : null
    },

    attachToElement: function (element) {
      this.element = element

      var elementStyle = window.getComputedStyle(element)
      this.elementStylesAffectingWidth = [
        'font-family:' + elementStyle.fontFamily + ';',
        'font-size:' + elementStyle.fontSize + ';'
      ].join('')

      // Force `content-box` on the `element`.
      element.style.boxSizing = 'content-box'

      if (!this.disableAuto) {
        // Call `resize` on every `input` event (IE9+).
        element.addEventListener('input', this.resizeHandler, false)
      }

      // Resize the input to match its initial value
      var initialWidth = this.resize()

      // Set `min-width` if `options.minWidth` was set, and only if the initial
      // width is non-zero.
      if (this.minWidth && initialWidth !== '0px') {
        element.style.minWidth = initialWidth
      }
    },

    destroy: function () {
      if (this.element && !this.disableAuto) {
        this.element.removeEventListener('input', this.resizeHandler, false)
      }
      this.element = null
    }
  }

  // shorthand method to add autosizing behavior to an element
  function autosizeInput (element, options) {
    var autosizer = Object.create(AutoSizer)
    autosizer.init(options)
    autosizer.attachToElement(element)

    // return 'resize' function
    return function (str) {
      autosizer.resize(str)
    }
  }

  // Factory function for creating an `AutoSizer` instance
  // This provides the option of having more fine-grained control
  // over the resizing process.
  autosizeInput.createAutoSizer = function (options) {
    var autoSizer = Object.create(AutoSizer)
    autoSizer.init(options)
    return autoSizer
  }

  if (typeof module === 'object') {
    module.exports = autosizeInput
  } else {
    window.autosizeInput = autosizeInput
  }
})()
