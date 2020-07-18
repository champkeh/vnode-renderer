import {h} from './h.js'
import {render} from './render.js'

const dynamicClass = ['class-b', 'class-c']

const vnode = h(
    'div',
    {
        class: ['cls-a cls-b', dynamicClass]
    }
)
console.log(vnode)

render(vnode, document.getElementById('app'))

