var Geometry = require('gl-geometry')
var Shader = require('gl-shader')
var context = require('gl-context')
var mat4 = require('gl-mat4')
var vignette = require('gl-vignette-background')
var glslify = require('glslify')
var orbit = require('canvas-orbit-camera')
var fit = require('canvas-fit')
var unindex = require('unindex-mesh')
var reindex = require('mesh-reindex')
var eye = require('eye-vector')
var time = require('right-now')
var normals = require('normals')
var css = require('dom-css')
var extrude = require('./index.js')

var canvas = document.body.appendChild(document.createElement('canvas'))
css(canvas, {zIndex: -1000})

var camera = orbit(canvas)
var gl = context(canvas, render)

var shapes = ['triangle', 'square', 'hexagon', 'circle', 'heart']
var options = document.body.appendChild(document.createElement('div'))
css(options, {position: 'absolute', width: '15%', right: '3%', top: '3%'})

var items = []
shapes.forEach(function (shape, i) {
  items[i] = options.appendChild(document.createElement('div'))
  items[i].innerHTML = shape
  css(items[i], {
    position: 'relative',
    right: 0, top: 0,
    fontSize: window.innerWidth * 0.04,
    marginBottom: window.innerWidth * 0.02,
    textAlign: 'left', 
    borderBottom: 'solid 3px black',
    width: '100%'
  })
  window.addEventListener('resize', function () {
    css(items[i], {fontSize: window.innerWidth * 0.04})
  })
})

window.addEventListener('resize', fit(canvas), false)

camera.lookAt([3, 3, 4], [0, 0, 0], [1, 0, 0])

var selection = 2
var shape

if (selection === 0) {
  shape = require('./shapes/triangle.js')
}

if (selection === 1) {
  shape = require('./shapes/square.js')
}

if (selection === 2) {
  shape = require('./shapes/hexagon.js')
}

if (selection === 3) {
  shape = require('./shapes/circle.js')
}

if (selection === 4) {
  shape = require('./shapes/heart.js')
}

console.log(shape)

var complex = extrude(shape.points, {top: 0.5, bottom: -0.5, closed: true})

var geometry = Geometry(gl)

var flattened = unindex(complex.positions, complex.cells)
complex = reindex(flattened)
complex.normals = normals.vertexNormals(complex.cells, complex.positions)
geometry.attr('position', complex.positions)
geometry.attr('normal', complex.normals)
geometry.faces(complex.cells)

var shader = Shader(gl,
  glslify('./shaders/demo.vert'),
  glslify('./shaders/demo.frag')
)

var projection = mat4.create()
var view = mat4.create()

var background = vignette(gl)

function render () {
  var width = gl.drawingBufferWidth
  var height = gl.drawingBufferHeight

  var now = time() * 0.001
  var axis = Math.sin(now) * 2

  var aspect = width / height
  var fov = Math.PI / 4
  var near = 0.01
  var far = 1000
  mat4.perspective(projection, fov, aspect, near, far)

  camera.rotate([0, 0, 0], [axis * 0.005, -0.005, 0])

  camera.view(view)
  camera.tick()

  gl.viewport(0, 0, width, height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.disable(gl.DEPTH_TEST)

  background.style({
    scale: [width * 0.0009, height * 0.0009],
    smoothing: [-0.4, 0.6],
    aspect: aspect,
    color1: [1, 1, 1],
    color2: shape.colors[0],
    coloredNoise: false,
    noiseAlpha: 0.2,
    offset: [0, 0]
  })

  background.draw()

  gl.enable(gl.DEPTH_TEST)

  geometry.bind(shader)
  shader.uniforms.projection = projection
  shader.uniforms.view = view
  shader.uniforms.eye = eye(view)
  shader.uniforms.color1 = shape.colors[0]
  shader.uniforms.color2 = shape.colors[1]
  geometry.draw(gl.TRIANGLES)
  geometry.unbind()
}
