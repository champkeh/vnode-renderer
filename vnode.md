# VNode 的设计

## 用 VNode 描述真实 DOM
一个 `html` 标签有它的名字、属性、事件、样式、子节点等诸多信息，这些内容都需要在 `VNode` 中体现，
我们可以使用如下对象来描述一个红色背景的正方形 `div` 元素:
```js
const elementVNode = {
    tag: 'div',
    data: {
        style: {
            width: '100px',
            height: '100px',
            backgroundColor: 'red'        
        }    
    }
}
```

我们用 `tag` 属性来存储标签的名字，用 `data` 属性来存储该标签的附加信息，比如 `style`、`class`、事件
等，通常我们把一个 `VNode` 对象的 `data` 属性称为 `VNodeData`。


使用 `children` 属性来描述子节点:
```js
const elementVNode = {
    tag: 'div',
    data: null,
    children: {
        tag: 'span',
        data: null    
    }
}
```

若有多个子节点，则可以把 `children` 属性设计为一个数组:
```js
const elementVNode = {
    tag: 'div',
    data: null,
    children: [
        {
            tag: 'h1',
            data: null        
        },
        {
            tag: 'p',
            data: null
        }
    ]
}
```

描述文本节点:
```js
const textVNode = {
    tag: null,
    data: null,
    children: '文本内容'
}
```
由于文本节点没有标签名字，所以它的 `tag` 属性值为 `null`。由于文本节点也无需用额外的 `VNodeData` 来描述附加属性，
所以其 `data` 属性值也是 `null`。

在这里，我们重用了 `children` 属性来存储文本内容数据，当然也可以使用 `data` 属性，甚至创建一个新的 `text` 属性专门
存储文本数据也是可以的。这主要取决于你的设计，**尽可能在保证语义能够说得通的情况下复用属性，会使得 `VNode` 对象更加
轻量。**

下面是一个以文本节点作为子节点的 `div` 标签的 `VNode` 对象:
```js
const elementVNode = {
    tag: 'div',
    data: null,
    children: {
        tag: null,
        data: null,
        children: '文本内容'
    }
}
```


## 用 VNode 描述抽象内容
这里的抽象内容指的是，区别于 `html` 标签的组件

```jsx
<div>
    <MyComponent />
</div>
```

我们使用如下 `VNode` 对象来描述上面的模板:
```js
const elementVNode = {
    tag: 'div',
    data: null,
    children: {
        tag: MyComponent,
        data: null
    }
}
```
如上，用来描述组件的 `VNode`，其 `tag` 属性值引用的就是组件类(或函数)本身，而不是标签名称字符串。
所以理论上，我们可以通过检查 `tag` 属性值是否是字符串来确定一个 `VNode` 是否是普通标签。


### 用 VNode 描述 Fragment
`Fragment` 的意图是要渲染一个片段，假设我们有如下模板:
```jsx
<template>
    <table>
        <tr>
            <Columns />
        </tr>
    </table>
</template>
``` 
组件 `Columns` 会返回多个 `<td>` 元素:
```jsx
<template>
    <td></td>
    <td></td>
    <td></td>
</template>
```
大家思考一下，如果按照现在的设计，该如何用 `VNode` 来描述这样一个模板呢？

如果模板中只有一个 `td` 标签，即只有一个根元素，这很容易表示:
```js
const elementVNode = {
    tag: 'td',
    data: null
}
```

但是模板中不仅仅只有一个 `td` 标签，而是有多个 `td` 标签，也就是有多个根元素，这该如何表示呢？

此时，我们就需要引入一个抽象元素，也就是我们要介绍的 `Fragment`。
```js
const Fragment = Symbol()
const fragmentVNode = {
    tag: Fragment, // tag 属性值是一个唯一标识(symbol)
    data: null,
    children: [
        {
            tag: 'td',
            data: null
        },
        {
            tag: 'td',
            data: null
        },
        {
            tag: 'td',
            data: null
        }
    ]
}
```
如上，我们把所有 `td` 标签都作为 `fragmentVNode` 的子节点，而根元素 `Fragment` 并不是一个实实在在
的真实 DOM，而是一个抽象的标识，也就是我们创建的一个唯一的 `symbol`。

当渲染器在渲染 `VNode` 时，如果发现该 `VNode` 的 `tag` 是 `Fragment`，就只需要把该 `VNode` 的子节点
渲染到页面即可。

> 其实，我们思考一下，上面的文本节点也可以用一个唯一的 symbol 来表示
> 还是那句话，如何设计 VNode 取决于你自己。并不存在完全正确的设计。
> 其实更推荐的做法是，使用一个单独的 flags 属性来标识该 VNode 的类型。


### 使用 VNode 描述 Portal
首先，什么是 `Portal`？

一句话：它允许你把内容渲染到任何地方。其应用场景是，假设你要实现一个蒙层组件 `<Overlay />`，要求该组件的 `z-index`
层级最高，这样无论在哪里使用都希望它能够遮住全部内容。
```jsx
<template>
    <div id="box" style="z-index: -1;">
        <Overlay />
    </div>
</template>
```
如上，不幸的事情发生了，在没有 `Portal` 的情况下，上面的 `<Overlay />` 组件的内容只能渲染到 `id="box"` 的 `div` 标签下，
这就会导致蒙层的层级失效甚至布局都可能会受到影响。

其实解决办法也很简单，假如 `<Overlay />` 组件要渲染的内容不受 DOM 层级关系的限制，也就是说，该组件可以渲染到任意位置，该问题就
迎刃而解了。

使用 `Portal` 可以这样编写 `<Overlay />` 组件的模板:
```jsx
<template>
    <Portal target="#app-root">
        <div class="overlay"></div>
    </Portal>
</template>
```
其最终效果是，无论你在何处使用 `<Overlay />` 组件，它都会把内容渲染到 `id="app-root"` 的元素下。
由此可知，所谓的 `Portal` 就是把子节点渲染到给定的目标，我们可以使用如下的 `VNode` 对象来描述上面这段模板:
```js
const Portal = Symbol()
const portalVNode = {
    tag: Portal,
    data: {
        target: '#app-root'
    },
    children: {
        tag: 'div',
        data: {
            class: 'overlay'
        }
    }
}
```
`Portal` 类型的 `VNode` 与 `Fragment` 类型的 `VNode` 类似，都需要一个唯一的标识，来区分其类型，目的是告诉渲染器如何渲染
该 `VNode`。


## VNode 的种类
当 `VNode` 描述不同的事物时，其属性的值也各不相同。比如一个 `VNode` 对象是 `html` 标签的描述，那么其 `tag` 属性
值就是一个字符串，即标签的名字；如果是组件的描述，那么其 `tag` 属性值则引用组件类(或函数)本身；如果是文本节点的
描述，那么其 `tag` 属性值为 `null`。

因此，我们可以把 `VNode` 分成五类，分别是：`html/svg` 元素、组件、纯文本、`Fragment` 以及 `Portal`：
![vnode types](assets/vnode-types.png)


## 使用 flags 作为 VNode 的类型标识
既然 `VNode` 有类别之分，我们就有必要使用一个唯一的标识，来标明某一个 `VNode` 属于哪一类。同时给 `VNode` 添加 `flags`
也是 `Virtual DOM` 算法的优化手段之一。

比如，在 `Vue2` 中区分 `VNode` 是 `html` 元素还是组件亦或是普通文本，是这样的：
1. 拿到 `VNode` 后先尝试把它当作组件去处理，如果成功地创建了组件，那说明该 `VNode` 就是组件的 `VNode`
2. 如果没能成功地创建组件，则检查 `vnode.tag` 是否有定义，如果有定义，则当作普通标签元素处理
3. 如果 `vnode.tag` 没有定义，则检查是否是注释节点
4. 如果不是注释节点，则会把它当作文本节点对待

以上这些判断都是在挂载(或 `patch`)阶段进行的，换句话说，一个 `VNode` 到底描述的是什么是在挂载或 `patch` 的时候才知道的。
这就带来了两个难题：无法从 `AOT` 的层面优化、开发者无法手动优化。

为了解决这个问题，我们的思路是在 `VNode` 创建的时候就把该 `VNode` 的类型通过 `flags` 标明，这样在挂载或 `patch` 阶段通过
`flags` 可以直接避免掉很多消耗性能的判断：
```js
if (flags & VNodeFlags.ELEMENT) {
    // VNode 是普通标签
    mountElement(/* ... */)
} else if (flags & VNodeFlags.COMPONENT) {
    // VNode 是组件
    mountComponent(/* ... */)
} else if (flags & VNodeFlags.TEXT) {
    // VNode 是纯文本
    mountText(/* ... */)
}
```


## children 和 ChildrenFlags
DOM 是一棵树，那么既然 `VNode` 是真实渲染内容的描述，那么它必然也是一棵树。在之前的设计中，我们给 `VNode` 定义了 `children` 属性，
用来存储子 `VNode`。大家思考一下，一个标签的子节点会有几种情况？

总的来说，无非有以下几种：
- 没有子节点
- 只有一个子节点
- 多个子节点
  - 有 `key`
  - 无 `key`
- 不知道子节点的情况


## VNodeData 的设计


最后，我们设计的 `VNode` 结构如下：
```ts
export interface VNode {
  // _isVNode 属性在上文中没有提到，它是一个始终为 true 的值，有了它，我们就可以判断一个对象是否是 VNode 对象
  _isVNode: true
  // el 属性在上文中也没有提到，当一个 VNode 被渲染为真实 DOM 之后，el 属性的值会引用该真实 DOM
  el: Element | null
  flags: null
  tag: string | null
  data: null
  children: null
  childFlags: null
}
```
