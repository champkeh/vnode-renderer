import {VNodeFlags, ChildrenFlags} from "./flags.js"
import {createTextVNode} from "./h.js"

export function render(vnode, container) {
    const prevVNode = container.vnode
    if (prevVNode == null) {
        if (vnode) {
            // 没有旧的 VNode，只有新的 VNode。使用 `mount` 函数挂载全新的 VNode
            mount(vnode, container)

            // 将新的 VNode 添加到 container.vnode 属性下，这样下一次渲染时旧的 VNode 就存在了
            container.vnode = vnode
        }
    } else {
        if (vnode) {
            // 有旧的 VNode，也有新的 VNode。则使用 `patch` 函数打补丁
            patch(prevVNode, vnode, container)

            // 更新 container.vnode
            container.vnode = vnode
        } else {
            // 有旧的 VNode，但是没有新的 VNode，这说明应该移除 DOM，在浏览器中可以使用 removeChild 函数。
            container.removeChild(prevVNode)
            container.vnode = null
        }
    }
}


function mount(vnode, container, isSVG) {
    const {flags} = vnode
    if (flags & VNodeFlags.ELEMENT) {
        // 挂载普通标签
        mountElement(vnode, container, isSVG)
    } else if (flags & VNodeFlags.COMPONENT) {
        // 挂载组件
        mountComponent(vnode, container)
    } else if (flags & VNodeFlags.TEXT) {
        // 挂载纯文本
        mountText(vnode, container)
    } else if (flags & VNodeFlags.FRAGMENT) {
        // 挂载 Fragment
        mountFragment(vnode, container)
    } else if (flags & VNodeFlags.PORTAL) {
        // 挂载 Portal
        mountPortal(vnode, container)
    }
}

function patch(prevVNode, vnode, container) {

}

const domPropsRE = /\[A-Z]|^(?:value|checked|selected|muted)$/

// 挂载 html/svg 标签
function mountElement(vnode, container, isSVG) {
    isSVG = isSVG || vnode.flags & VNodeFlags.ELEMENT_SVG

    // 创建元素
    const el = isSVG
        ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag)
        : document.createElement(vnode.tag)
    vnode.el = el

    // 处理 VNodeData
    const data = vnode.data
    if (data) {
        for (let key in data) {
            switch (key) {
                case 'style':
                    for (let k in data.style) {
                        el.style[k] = data.style[k]
                    }
                    break
                case 'class':
                    if (isSVG) {
                        el.setAttribute('class', data[key])
                    } else {
                        el.className = data[key]
                    }
                    break
                default:
                    if (key[0] === 'o' && key[1] === 'n') {
                        // 事件
                        el.addEventListener(key.slice(2), data[key])
                    } else if (domPropsRE.test(key)) {
                        // 当作 DOM Prop 处理
                        el[key] = data[key]
                    } else {
                        // 当作 Attr 处理
                        el.setAttribute(key, data[key])
                    }
                    break
            }
        }
    }

    // 拿到 children 和 childFlags
    const {childFlags, children} = vnode
    // 检测如果没有子节点，则无需递归挂载
    if (childFlags !== ChildrenFlags.NO_CHILDREN) {
        if (childFlags & ChildrenFlags.SINGLE_VNODE) {
            // 如果是单个子节点，则调用 mount 函数挂载
            mount(children, el, isSVG)
        } else if (childFlags & ChildrenFlags.MULTIPLE_VNODES) {
            // 如果是多个子节点，则递归挂载
            for (let i = 0; i < children.length; i++) {
                mount(children[i], el, isSVG)
            }
        }
    }

    // 将元素添加到容器
    container.appendChild(el)
}


// 挂载 组件
function mountComponent(vnode, container) {
    if (vnode.flags & VNodeFlags.COMPONENT_STATEFUL) {
        mountStatefulComponent(vnode, container)
    } else {
        mountFunctionalComponent(vnode, container)
    }
}

// 挂载 带状态组件
function mountStatefulComponent(vnode, container) {
    // 创建组件实例
    const instance = new vnode.tag()
    // 渲染 VNode
    instance.$vnode = instance.render()
    // 挂载
    mount(instance.$vnode, container)
    // el 属性值 和 组件实例的 $el 属性都引用组件的根 DOM 元素
    instance.$el = vnode.el = instance.$vnode.el
}

// 挂载 函数式组件
function mountFunctionalComponent(vnode, container) {
    // 获取 VNode
    const $vnode = vnode.tag()
    // 挂载
    mount($vnode, container)
    // el 属性引用该组件的根元素
    vnode.el = $vnode.el
}

// 挂载纯文本节点
function mountText(vnode, container) {
    const el = document.createTextNode(vnode.children)
    vnode.el = el
    container.appendChild(el)
}

// 挂载 Fragment
function mountFragment(vnode, container) {
    // 拿到 children 和 childFlags
    const {childFlags, children} = vnode
    switch (childFlags) {
        case ChildrenFlags.SINGLE_VNODE:
            // 如果是单个子节点，则调用 mount 函数挂载
            mount(children, container)
            // 单个子节点，fragment 的 el 就指向该节点
            vnode.el = children.el
            break
        case ChildrenFlags.NO_CHILDREN:
            // 如果没有子节点，等价于挂载空片段，会创建一个空的文本节点占位
            const placeholder = createTextVNode('')
            mountText(placeholder, container)
            // 没有子节点，则指向占位的空文本节点
            vnode.el = placeholder.el
            break
        default:
            // 多个子节点，则递归挂载
            for (let i = 0; i < children.length; i++) {
                mount(children[i], container)
            }
            // 多个子节点，指向第一个子节点
            vnode.el = children[0].el
    }
}

// 挂载 Portal
function mountPortal(vnode, container) {
    const {tag, children, childFlags} = vnode

    // 获取挂载点
    const target = typeof tag === 'string' ? document.querySelector(tag) : tag

    if (childFlags & ChildrenFlags.SINGLE_VNODE) {
        // 单个子节点，将 children 挂载到 target 上，而非 container
        mount(children, target)
    } else if (childFlags & ChildrenFlags.MULTIPLE_VNODES) {
        for (let i = 0; i < children.length; i++) {
            // 将 children 挂载到 target 上，而非 container
            mount(children[i], target)
        }
    }

    // 占位的空文本节点
    const placeholder = createTextVNode('')
    // 将该节点挂载到 container 中
    mountText(placeholder, container)
    // el 属性引用该节点
    vnode.el = placeholder.el
}

export class Component {
    render() {
        throw new Error('组件缺少 render 函数')
    }
}
