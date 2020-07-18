import {VNodeFlags,ChildrenFlags} from "./flags.js";

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


// 没有子节点的 div 标签
const elementVnode = {
    flags: VNodeFlags.ELEMENT_HTML,
    tag: 'div',
    data: null,
    childFlags: ChildrenFlags.NO_CHILDREN,
    children: null
}

// 文本节点的 childFlags 始终都是 NO_CHILDREN
const textVnode = {
    flags: VNodeFlags.TEXT,
    tag: null,
    data: null,
    childFlags: ChildrenFlags.NO_CHILDREN,
    children: '我是文本'
}

// 拥有多个使用了 key 的 li 标签作为子节点的 ul 标签
const elementVnode2 = {
    flags: VNodeFlags.ELEMENT_HTML,
    tag: 'ul',
    data: null,
    childFlags: ChildrenFlags.KEYED_VNODES,
    children: [
        {
            flags: VNodeFlags.ELEMENT_HTML,
            tag: 'li',
            data: null,
            key: 0
        },
        {
            flags: VNodeFlags.ELEMENT_HTML,
            tag: 'li',
            data: null,
            key: 1
        }
    ]
}

// 只有一个子节点的 Fragment
const elementVnode3 = {
    flags: VNodeFlags.FRAGMENT,
    tag: null,
    data: null,
    childFlags: ChildrenFlags.SINGLE_VNODE,
    children: {
        flags: VNodeFlags.ELEMENT_HTML,
        tag: 'p',
        data: null
    }
}
