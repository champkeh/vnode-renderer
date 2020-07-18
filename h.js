import {VNodeFlags, VNodeFlagsDescription, ChildrenFlags, ChildrenFlagsDescription} from "./flags.js"

// Fragment 唯一标识
export const Fragment = Symbol("Fragment")

// Portal 唯一标识
export const Portal = Symbol("Portal")


// 创建 vnode 的辅助函数
export function h(tag, data = null, children = null) {
    // 确定 flags
    let flags = null
    if (typeof tag === 'string') {
        flags = tag === 'svg' ? VNodeFlags.ELEMENT_SVG : VNodeFlags.ELEMENT_HTML
        // 序列号 class
        if (data && data.class != null) {
            data.class = normalizeClass(data.class)
        }
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

    // 确定 childFlags
    let childFlags = null
    if (Array.isArray(children)) {
        const {length} = children
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


// 创建纯文本节点的 VNode
export function createTextVNode(text) {
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

function normalizeClass(cls) {
    // res 是最终要返回的类名字符串
    let res = ''
    if (typeof cls === 'string') {
        res = cls
    } else if (Array.isArray(cls)) {
        for (let i = 0; i < cls.length; i++) {
            res += normalizeClass(cls[i]) + ' '
        }
    } else if (typeof cls === 'object') {
        for (const key in cls) {
            if (cls[key]) {
                res += key + ' '
            }
        }
    }

    return res.trim()
}
