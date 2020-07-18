# vnode-renderer
vnode的渲染器

## VNode 的设计
```ts
enum VNodeFlags {}
enum ChildrenFlags {}

export interface VNode {
  // _isVNode 是一个始终为 true 的值，有了它，我们就可以判断一个对象是否是 VNode 对象
  _isVNode: true
  // 当一个 VNode 被渲染为真实 DOM 之后，el 属性的值会引用该真实 DOM
  el: Element | null
  flags: VNodeFlags
  flagsDesc: string
  tag: string | Function
  data: Object | null
  children: [VNode] | VNode | null
  childFlags: ChildrenFlags
  childFlagsDesc: string
}
```
[详细内容](vnode.md)

## 应用层代码
```js
import {render, h, Fragment, Portal, Component} from './core.js'

console.log(h('div', null, h('span')))

console.log(h('div', null, '我是文本'))
```
