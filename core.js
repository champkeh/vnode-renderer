import {VNodeFlags,ChildrenFlags, VNodeFlagsDescription, ChildrenFlagsDescription} from "./vnode.js";

export function render(vnode, container) {
    mount(vnode, container)
}

function mount(vnode, container) {
    if (typeof vnode.tag === 'string') {
        // html 标签
        mountElement(vnode, container)
    } else {
        // 组件
        mountComponent(vnode, container)
    }
}

// 挂载 html 标签
function mountElement(vnode, container) {
    // 创建元素
    const el = document.createElement(vnode.tag)

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

// Fragment 唯一标识
export const Fragment = Symbol("Fragment")

// Portal 唯一标识
export const Portal = Symbol("Portal")

function normalizeVNodes(children) {
    const newChildren = []

    // 遍历 children
    for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (child.key == null) {
            // 如果原来的 VNode 没有 key，则使用竖线(|)与该 VNode 在数组中的索引拼接而成的字符串作为 key
            child.key = '|' + i
        }
        newChildren.push(child)
    }
    // 此时 children 的类型就是 ChildrenFlags.KEYED_VNODES
    return newChildren
}

// 创建纯文本节点的 VNode
function createTextVNode(text) {
    return {
        _isVNode: true,
        el: null,
        flags: VNodeFlags.TEXT,
        flagsDesc: VNodeFlagsDescription[VNodeFlags.TEXT],
        tag: null,
        data: null,
        childFlags: ChildrenFlags.NO_CHILDREN,
        childFlagsDesc: ChildrenFlagsDescription[ChildrenFlags.NO_CHILDREN],
        children: text
    }
}

// 创建 vnode 的辅助函数
export function h(tag, data = null, children = null) {
    let flags = null
    if (typeof tag === 'string') {
        flags = tag === 'svg' ? VNodeFlags.ELEMENT_SVG : VNodeFlags.ELEMENT_HTML
    } else if (tag === Fragment) {
        flags = VNodeFlags.FRAGMENT
    } else if (tag === Portal) {
        flags = VNodeFlags.PORTAL
        tag = data && data.target // 重写 tag，将 target 赋值上去
    } else {
        if (tag !== null && typeof tag === 'object') {
            // 兼容 vue2 的对象式组件
            flags = tag.functional
                ? VNodeFlags.COMPONENT_FUNCTIONAL       // 函数式组件
                : VNodeFlags.COMPONENT_STATEFUL_NORMAL  // 带状态组件
        } else if (typeof tag === 'function') {
            // vue3 的类组件
            flags = tag.prototype && tag.prototype.render
                ? VNodeFlags.COMPONENT_STATEFUL_NORMAL  // 带状态组件
                : VNodeFlags.COMPONENT_FUNCTIONAL       // 函数式组件
        }
    }

    let childFlags = null
    if (Array.isArray(children)) {
        const { length } = children
        if (length === 0) {
            // 没有 children
            childFlags = ChildrenFlags.NO_CHILDREN
        } else if (length === 1) {
            // 单个子节点
            childFlags = ChildrenFlags.SINGLE_VNODE
            children = children[0]
        } else {
            // 多个子节点，且子节点使用 key
            childFlags = ChildrenFlags.KEYED_VNODES
            children = normalizeVNodes(children)
        }
    } else if (children == null) {
        // 没有 children
        childFlags = ChildrenFlags.NO_CHILDREN
    } else if (children._isVNode) {
        // 单个子节点
        childFlags = ChildrenFlags.SINGLE_VNODE
    } else {
        // 其他情况都作为文本节点处理，即单个子节点
        // 调用 createTextVNode 创建纯文本类型的 VNode
        childFlags = ChildrenFlags.SINGLE_VNODE
        children = createTextVNode(children + '')
    }

    return {
        _isVNode: true,
        el: null,
        flags,
        flagsDesc: VNodeFlagsDescription[flags],
        tag,
        data,
        childFlags,
        childFlagsDesc: ChildrenFlagsDescription[childFlags],
        children
    }
}

export class Component {
    render() {
        throw new Error('组件缺少 render 函数')
    }
}
