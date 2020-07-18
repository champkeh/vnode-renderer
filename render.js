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
    const instance = (vnode.instance = new vnode.tag())

    // 初始化 props
    instance.$props = vnode.data

    instance._update = function() {
        // 如果 instance._mounted 为真，说明组件已经挂载，应该执行更新操作
        if (instance._mounted) {
            // 1. 拿到旧的 VNode
            const prevVNode = instance.$vnode
            // 2. 重新渲染新的 VNode
            const nextVNode = (instance.$vnode = instance.render())
            // 3. patch 更新
            patch(prevVNode, nextVNode, prevVNode.el.parentNode)
            // 4. 更新 vnode.el 和 $el
            instance.$el = vnode.el = instance.$vnode.el
        } else {
            // 1. 渲染 VNode
            instance.$vnode = instance.render()
            // 2. 挂载
            mount(instance.$vnode, container)
            // 3. 组件已经挂载的标识
            instance._mounted = true
            // 4. el 属性值 和 组件实例的 $el 属性都引用组件的根 DOM 元素
            instance.$el = vnode.el = instance.$vnode.el
            // 5. 调用 mounted 钩子
            instance.mounted && instance.mounted()
        }
    }

    instance._update()
}

// 挂载 函数式组件
function mountFunctionalComponent(vnode, container) {
    // 在函数式组件类型的 vnode 上添加 handle 属性，它是一个对象
    vnode.handle = {
        prev: null,
        next: vnode,
        container,
        update() {
            if (vnode.handle.prev) {
                // 更新
                // prevVNode 是旧的组件 VNode，nextVNode 是新的组件的 VNode
                const prevVNode = vnode.handle.prev
                const nextVNode = vnode.handle.next

                // prevTree 是组件产出的旧的 VNode
                const prevTree = prevVNode.instance
                // 更新 props 数据
                const props = nextVNode.data
                // nextTree 是组件产出的新的 VNode
                const nextTree = (nextVNode.instance = nextVNode.tag(props))
                // 调用 patch 函数更新
                patch(prevTree, nextTree, vnode.handle.container)
            } else {
                // 初始化 props
                const props = vnode.data
                // 获取 VNode
                const $vnode = (vnode.instance = vnode.tag(props))
                // 挂载
                mount($vnode, container)
                // el 属性引用该组件的根元素
                vnode.el = $vnode.el
            }
        }
    }

    // 立即调用 vnode.handle.update 完成初次挂载
    vnode.handle.update()
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
        case ChildrenFlags.NO_CHILDREN:
            // 如果没有子节点，等价于挂载空片段，会创建一个空的文本节点占位
            const placeholder = createTextVNode('')
            mountText(placeholder, container)
            // 没有子节点，则指向占位的空文本节点
            vnode.el = placeholder.el
            break
        case ChildrenFlags.SINGLE_VNODE:
            // 如果是单个子节点，则调用 mount 函数挂载
            mount(children, container)
            // 单个子节点，fragment 的 el 就指向该节点
            vnode.el = children.el
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


function patch(prevVNode, nextVNode, container, isSVG) {
    // 分别拿到新旧 VNode 的类型，即 flags
    const nextFlags = nextVNode.flags
    const prevFlags = prevVNode.flags

    // 检查新旧 VNode 的类型是否相同，如果类型不同，则直接调用 replaceVNode 函数替换 VNode
    // 如果新旧 VNode 的类型相同，则根据不同的类型调用不同的比对函数
    if (prevFlags !== nextFlags) {
        replaceVNode(prevVNode, nextVNode, container)
    } else if (nextFlags & VNodeFlags.ELEMENT) {
        isSVG = isSVG || nextVNode.flags & VNodeFlags.ELEMENT_SVG

        patchElement(prevVNode, nextVNode, container, isSVG)
    } else if (nextFlags & VNodeFlags.COMPONENT) {
        patchComponent(prevVNode, nextVNode, container)
    } else if (nextFlags & VNodeFlags.TEXT) {
        patchText(prevVNode, nextVNode)
    } else if (nextFlags & VNodeFlags.FRAGMENT) {
        patchFragment(prevVNode, nextVNode, container)
    } else if (nextFlags & VNodeFlags.PORTAL) {
        patchPortal(prevVNode, nextVNode, container)
    }
}

function replaceVNode(prevVNode, nextVNode, container, isSVG) {
    // 将旧的 VNode 所渲染的 DOM 从容器中移除
    container.removeChild(prevVNode.el)

    // 如果将要被移除的 VNode 类型是组件，则需要调用该组件实例的 unmounted 钩子函数
    if (prevVNode.flags & VNodeFlags.COMPONENT_STATEFUL_NORMAL) {
        // 类型为有状态组件的 VNode，其 instance 属性被用来存储组件实例对象
        const instance = prevVNode.instance
        instance.unmounted && instance.unmounted()
    }

    // 再把新的 VNode 挂载到容器中
    mount(nextVNode, container, isSVG)
}


function patchElement(prevVNode, nextVNode, container, isSVG) {
    // 如果新旧 VNode 描述的是不同的标签，则调用 replaceVNode 函数，使用新的 VNode 替换旧的 VNode
    if (prevVNode.tag !== nextVNode.tag) {
        replaceVNode(prevVNode, nextVNode, container, isSVG)
        return
    }

    // 拿到 el 元素，注意这时要让 nextVNode.el 也引用该元素
    const el = (nextVNode.el = prevVNode.el)

    // 拿到 新旧 VNodeData
    const prevData = prevVNode.data
    const nextData = nextVNode.data

    if (nextData) {
        // 遍历新的 VNodeData，将旧值和新值都传递给 patchData 函数
        for (let key in nextData) {
            const prevValue = prevData[key]
            const nextValue = nextData[key]
            patchData(el, key, prevValue, nextValue, isSVG)
        }
    }

    if (prevData) {
        // 遍历旧的 VNodeData，将已经不存在于新的 VNodeData 中的数据移除
        for (let key in prevData) {
            const prevValue = prevData[key]
            if (prevValue && !nextData.hasOwnProperty(key)) {
                // 第四个参数为 null，代表移除数据
                patchData(el, key, prevValue, null, isSVG)
            }
        }
    }

    // 调用 patchChildren 函数递归地更新子节点
    patchChildren(
        prevVNode.childFlags,   // 旧的 VNode 子节点的类型
        nextVNode.childFlags,   // 新的 VNode 子节点的类型
        prevVNode.children,     // 旧的 VNode 子节点
        nextVNode.children,     // 新的 VNode 子节点
        el,                     // 当前标签元素，即这些子节点的父节点
        isSVG
    )
}


function patchData(el, key, prevValue, nextValue, isSVG) {
    switch (key) {
        case 'style':
            // 将新的样式应用到元素
            for (let k in nextValue) {
                el.style[k] = nextValue[k]
            }
            // 移除已经不存在的样式
            for (let k in prevValue) {
                if (!nextValue.hasOwnProperty(k)) {
                    el.style[k] = ''
                }
            }
            break
        case 'class':
            if (isSVG) {
                el.setAttribute('class', nextValue)
            } else {
                el.className = nextValue
            }
            break
        default:
            if (key[0] === 'o' && key[1] === 'n') {
                // 事件
                // 移除旧事件
                if (prevValue) {
                    el.removeEventListener(key.slice(2), prevValue)
                }
                // 添加新事件
                if (nextValue) {
                    el.addEventListener(key.slice(2), nextValue)
                }
            } else if (domPropsRE.test(key)) {
                // 当作 DOM Prop 处理
                el[key] = nextValue
            } else {
                // 当作 Attr 处理
                el.setAttribute(key, nextValue)
            }
            break
    }
}


function patchChildren(prevChildFlags, nextChildFlags, prevChildren, nextChildren, container, isSVG) {
    switch (prevChildFlags) {
        // 旧的 children 中没有子节点，会执行该 case 语句块
        case ChildrenFlags.NO_CHILDREN:
            switch (nextChildFlags) {
                case ChildrenFlags.NO_CHILDREN:
                    // 新的 children 中没有子节点
                    // 什么都不做
                    break
                case ChildrenFlags.SINGLE_VNODE:
                    // 新的 children 是单个子节点
                    // 使用 mount 函数将新的子节点挂载到容器元素
                    mount(nextChildren, container, isSVG)
                    break
                default:
                    // 新的 children 中有多个子节点
                    // 遍历多个子节点，逐个使用 mount 函数挂载到容器元素
                    for (let i = 0; i < nextChildren.length; i++) {
                        mount(nextChildren[i], container, isSVG)
                    }
                    break
            }
            break
        // 旧的 children 是单个子节点，会执行该 case 语句块
        case ChildrenFlags.SINGLE_VNODE:
            switch (nextChildFlags) {
                case ChildrenFlags.NO_CHILDREN:
                    // 新的 children 中没有子节点
                    for (let i = container.children.length-1; i >= 0; i--) {
                        container.removeChild(container.children[i])
                    }
                    break
                case ChildrenFlags.SINGLE_VNODE:
                    // 新的 children 是单个子节点
                    patch(prevChildren, nextChildren, container, isSVG)
                    break
                default:
                    // 新的 children 中有多个子节点
                    // 移除旧的单个子节点(可能是 Fragment，所以最好进行遍历操作)
                    for (let i = container.children.length-1; i >= 0; i--) {
                        container.removeChild(container.children[i])
                    }
                    // 遍历新的多个子节点，逐个挂载到容器中
                    for (let i = 0; i < nextChildren.length; i++) {
                        mount(nextChildren[i], container, isSVG)
                    }
                    break
            }
            break
        // 旧的 children 中有多个子节点时，会执行该 case 语句块
        default:
            switch (nextChildFlags) {
                case ChildrenFlags.NO_CHILDREN:
                    // 新的 children 中没有子节点
                    // 遍历旧的子节点，将其全部移除
                    for (let i = container.children.length-1; i >= 0; i--) {
                        container.removeChild(container.children[i])
                    }
                    break
                case ChildrenFlags.SINGLE_VNODE:
                    // 新的 children 是单个子节点
                    // 遍历旧的子节点，将其全部移除
                    for (let i = container.children.length-1; i >= 0; i--) {
                        container.removeChild(container.children[i])
                    }
                    mount(nextChildren, container, isSVG)
                    break
                default:
                    // 新的 children 中有多个子节点
                    // 遍历旧的子节点，将其全部移除
                    for (let i = container.children.length-1; i >= 0; i--) {
                        container.removeChild(container.children[i])
                    }
                    // 遍历新的子节点，将其全部添加
                    for (let i = 0; i < nextChildren.length; i++) {
                        mount(nextChildren[i], container, isSVG)
                    }
                    break
            }
            break
    }
}


function patchText(prevVNode, nextVNode) {
    // 拿到文本元素 el，同时让 nextVNode.el 指向该文本元素
    const el = (nextVNode.el = prevVNode.el)

    // 只有当新旧文本内容不一致时才有必要更新
    if (nextVNode.children !== prevVNode.children) {
        el.nodeValue = nextVNode.children
    }
}


function patchFragment(prevVNode, nextVNode, container) {
    // 直接调用 patchChildren 函数更新 新旧片段的子节点即可
    patchChildren(
        prevVNode.childFlags,   // 旧片段的子节点类型
        nextVNode.childFlags,   // 新片段的子节点类型
        prevVNode.children,     // 旧片段的子节点
        nextVNode.children,     // 新片段的子节点
        container,
        null
    )

    switch (nextVNode.childFlags) {
        case ChildrenFlags.NO_CHILDREN:
            // todo: 对于没有子节点的 Fragment，我们会有一个空文本的占位符，所以如何去引用这个空文本节点
            // nextVNode.el = nextVNode.children.el
            break
        case ChildrenFlags.SINGLE_VNODE:
            nextVNode.el = nextVNode.children.el
            break
        default:
            nextVNode.el = nextVNode.children[0].el
            break
    }
}


function patchPortal(prevVNode, nextVNode) {
    // 先获取旧的容器
    const oldContainer = typeof prevVNode.tag === 'string'
        ? document.querySelector(prevVNode.tag)
        : prevVNode.tag

    // 直接调用 patchChildren 函数更新 新旧子节点
    patchChildren(
        prevVNode.childFlags,
        nextVNode.childFlags,
        prevVNode.children,
        nextVNode.children,
        oldContainer, // 注意容器元素是旧的 container
        null
    )

    // 让 nextVNode.el 指向 prevVNode.el
    nextVNode.el = prevVNode.el

    // 如果新旧容器不同，才需要搬移
    if (nextVNode.tag !== prevVNode.tag) {
        // 获取新的容器元素，即挂载目标
        const container = typeof nextVNode.tag === 'string'
            ? document.querySelector(nextVNode.tag)
            : nextVNode.tag

        switch (nextVNode.childFlags) {
            case ChildrenFlags.NO_CHILDREN:
                // 新的 Portal 没有子节点，不需要搬移
                break
            case ChildrenFlags.SINGLE_VNODE:
                // 如果新的 Portal 是单个子节点，就把该节点搬移到新容器中
                // note: 如果这个单个子节点时 Fragment 类型，会不会出现问题呢？
                // 毕竟 Fragment 的 el 属性只指向它的第一个子节点
                if (nextVNode.children.flags & VNodeFlags.FRAGMENT) {
                    // 如果这个单个子节点的类型是 Fragment，则需要遍历它的父节点，把所有子节点都搬移
                    // todo: bug
                    let childCount = nextVNode.children.el.parentNode.children.length
                    console.log(childCount)
                    for (let i = 0; i < childCount; i++) {
                        container.appendChild(nextVNode.children.el.parentNode.children[0])
                    }
                } else {
                    container.appendChild(nextVNode.children.el)
                }
                break
            default:
                // 如果新的 Portal 是多个子节点，遍历逐个将它们搬移到新容器中
                for (let i = 0; i < nextVNode.children.length; i++) {
                    container.appendChild(nextVNode.children[i].el)
                }
                break
        }
    }
}


function patchComponent(prevVNode, nextVNode, container) {
    // tag 属性的值是组件类，通过比较新旧组件类是否相等来判断是否是相同的组件
    if (nextVNode.tag !== prevVNode.tag) {
        replaceVNode(prevVNode, nextVNode, container)
    } else if (nextVNode.flags & VNodeFlags.COMPONENT_STATEFUL_NORMAL) {
        // 1. 获取组件实例
        const instance = (nextVNode.instance = prevVNode.instance)
        // 2. 更新 props
        instance.$props = nextVNode.data
        // 3. 更新组件
        instance._update()
    } else if (nextVNode.flags & VNodeFlags.COMPONENT_FUNCTIONAL) {
        // 更新函数式组件
        // 通过 prevVNode.handle 拿到 handle 对象
        const handle = (nextVNode.handle = prevVNode.handle)

        // 更新 handle 对象
        handle.prev = prevVNode
        handle.next = nextVNode
        handle.container = container

        // 调用 update 函数完成更新
        handle.update()
    }
}
