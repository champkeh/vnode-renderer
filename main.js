import {h,Fragment,Portal} from './h.js'
import {render} from './render.js'


// const prevVNode = h(Portal, {target: '#old-container'}, [
//     h('p', null, '旧的 Portal1'),
//     h('p', null, '旧的 Portal2'),
//     h(Fragment, null, [
//         h('span', null, '我是旧的 Portal 中的文本1'),
//         h('span', null, '我是旧的 Portal 中的文本2'),
//     ])
// ])
//
// const nextVNode = h(Portal, {target: '#new-container'}, [
//     // h('p', null, '新的 Portal'),
//     h(Fragment, null, [
//         h('span', null, '我是新的 Portal 中的文本1'),
//         h('span', null, '我是新的 Portal 中的文本2'),
//     ])
// ])

// render(prevVNode, document.getElementById('app'))
// console.log(prevVNode)
// setTimeout(() => {
//     render(nextVNode, document.getElementById('app'))
//     console.log(nextVNode)
// }, 5000)

class ChildComponent {
    render() {
        return h('div', null, '我是子组件' + this.$props.text)
    }
}
function MyFunctionalComponent(props) {
    return h('div', null, props.text)
}
class ParentComponent {
    localState = 'one'

    mounted() {
        setTimeout(() => {
            this.localState = 'two'
            this._update()
        }, 5000)
    }

    render() {
        return h(MyFunctionalComponent, {text: this.localState})
    }
}

const vnode = h(ParentComponent)
console.log(vnode)

render(vnode, document.getElementById('app'))
