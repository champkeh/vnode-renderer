import {render, h, Fragment, Portal, Component} from './core.js'

console.log(h('div', null, h('span')))

console.log(h('div', null, '我是文本'))

console.log(h(Fragment, null, [h('td'), h('td')]))

console.log(h(Portal, {target: '#box'}, h('h1')))

function MyFunctionalComponent() {}

console.log(h(MyFunctionalComponent, null, h('div')))

class MyStatefulComponent extends Component {}

console.log(h(MyStatefulComponent, null, h('div')))
