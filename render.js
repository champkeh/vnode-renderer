import {VNodeFlags, ChildrenFlags} from "./flags.js"

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
    // 创建组件实例
    const instance = new vnode.tag()
    // 渲染
    instance.$vnode = instance.render()
    mount(instance.$vnode, container)
}

export class Component {
    render() {
        throw new Error('组件缺少 render 函数')
    }
}
