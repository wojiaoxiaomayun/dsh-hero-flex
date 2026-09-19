# dsh-hero-flex

DSH 插件：把**hero / 空白会话页右上角的 flex**（原 file-explorer 里“替代原始
右侧栏展开按钮”的那一块）抽成独立插件，并暴露一个**插件可追加的槽位**。

## 作用

- 接管 `conversation.session.header.corner`（single/session 座位）的 **priority -1**
  （最低 shadowing 优先级）→ 替换 shell 自带的右侧栏展开按钮（priority 0）
  及其他占用者。
- 渲染一行 hero flex：

  ```
  [ hero.flex 槽位条目（插件可追加） ] [ 重绘的右侧栏展开按钮 ]
  ```

- 通过注册时的 `children: { 'hero.flex': { kind: 'list', scope: 'session' } }`
  声明 `hero.flex` 子槽位 —— 任何插件都能往 hero 右上角 flex 里安装自己的组件。

## 其他插件如何接入

```ts
// 在插件的 apply() 里：
ctx.slots.inject('hero.flex', () =>
  ctx.slots.register(
    { name: 'hero.flex', id: '<你的唯一 id>', order: 10, label: '…' },
    (props) => <YourComponent sessionId={props.sessionId} />,
  ))
```

- `slots.inject` 自带「等待声明」机制：hero-flex 安装后声明 `hero.flex` 时才会注册；
  未安装 hero-flex 时 effect 永不触发，不会报错。
- 条目是 `session` 作用域：组件自动获得标准 session kit（`sessionId`、
  `useSession`、`useSessions` 等）。
- 有记录会话时 header 的 `utilities` 座位渲染，hero.flex 条目自动隐藏
  （只留重绘的展开按钮），避免与标题栏功能图标重复。

## 与 dsh-file-explorer 的关系

file-explorer 原先自己占用 corner 座位（priority -1）。现在它改为：
**只把 `HeroGroup` 注册进 `hero.flex`**（不再占用 corner、不再有
`shell.overlay` 浮层回退）——**未安装本插件时 file-explorer 的 hero 按钮组
完全不显示**，符合“没注入这个插件，hero 也不显示”的预期。

两者并存时互不冲突。

## 验证（profile test）

- `conversation.session.header.corner` 的占用者：hero-flex（priority -1，active）；
  shell 展开按钮（0，shadowed）、git-gui corner（1，shadowed）。
- `hero.flex` 已声明（declared by corner 条目），file-explorer 条目
  （id `file-explorer`，order 10）active。
- **不安装 hero-flex**：file-explorer 不渲染 hero 按钮组（无回退浮层）。
