export function render(vnode, container) {
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
    mountElement(instance.$vnode, container)
}
