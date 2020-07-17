import {render} from './core.js'
import {VNodeFlags} from "./vnode";

// html 元素节点
const htmlVnode = {
    flags: VNodeFlags.ELEMENT_HTML,
    tag: 'div',
    data: null
}

// svg 元素节点
const svgVnode = {
    flags: VNodeFlags.ELEMENT_SVG,
    tag: 'svg',
    data: null
}

const functionalComponentVnode = {
    flags: VNodeFlags.COMPONENT_FUNCTIONAL,
    tag: MyComponent
}

// Fragment
const fragmentVnode = {
    flags: VNodeFlags.FRAGMENT,
    tag: null
}

// Portal
const portalVnode = {
    flags: VNodeFlags.PORTAL,
    tag: target
}

// render(elementVnode, document.getElementById('app'))

class MyComponent {
    render() {
        // render 函数产出 VNode
        return {
            tag: 'div'
        }
    }
}

const componentVnode = {
    tag: MyComponent
}

render(componentVnode, document.getElementById('app'))
