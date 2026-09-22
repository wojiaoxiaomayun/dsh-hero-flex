// dsh-hero-flex — Client 半部（浏览器 UI）
//
// 接管 conversation.session.header.corner（single/session 座位，priority -1，
// 最低 shadowing 优先级 → 替换 shell 自带的右侧栏展开按钮 priority 0 及任何
// 其他占用者），渲染一行 hero flex：
//
//   [ hero.flex 槽位条目（插件可追加，仅空白会话 hero 显示） ] [ 重绘的展开按钮 ]
//
// 通过 `children: { 'hero.flex': { kind: 'list', scope: 'session' } }` 声明
// 插件可追加的子槽位：其他插件 `ctx.slots.inject('hero.flex', …)` 注册条目，
// 即可出现在 hero / 空白会话页右上角，与展开按钮并排。有记录会话时 header
// 的 utilities 座位正常渲染（功能图标在那里），因此 hero.flex 条目自动隐藏，
// 只留重绘的展开按钮——与 dsh-file-explorer 之前的 corner 占用规则一致。
//
// 重绘的展开按钮（data-sidebar-right-expand）与 shell 的 ExpandButton 同尺寸
// （28×28、镜像面板图标），点击走跨插件 sidebarRight 面的 toggleExpanded()；
// 面板展开时按 data-sidebar-right-open（shell 面板根节点自带的属性）自动隐藏。
window.__ModuleLoader__.load({
  id: '@dsh-xhl/dsh-hero-flex',
  factory(require) {
    const React = require('react')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const { IconPanelLeftOutlineRegular, Tooltip } = primitives

    // 缺一个原语就是致命的：插槽条目一旦在渲染期抛错，会被 SlotErrorBoundary
    // 捕获并「退位」(abdicate) —— 条目仍留在 ledger 上但不再渲染，corner 座位
    // 悄悄回落到 shell 自带按钮，表现为「插件装了却没反应」。所以这里显式检查，
    // 让名字写错时以可读错误在加载期暴露，而不是变成一次静默的退位。
    for (const [name, value] of [
      ['IconPanelLeftOutlineRegular', IconPanelLeftOutlineRegular],
      ['Tooltip', Tooltip]
    ]) {
      if (value === undefined) {
        throw new Error(
          'dsh-hero-flex: @deepseek-ai/dsh-client-ui-primitives 未导出 "' + name + '"' +
          '（图标命名规则是 OutlineRegular / OutlineMedium，没有 16 之类的尺寸后缀）'
        )
      }
    }

    // 右侧栏展开状态 / sidebarRight 面的 DOM 探针属性（与 shell 面板根一致）
    const SIDEBAR_OPEN_ATTR = 'data-sidebar-right-open'
    // utilities 座位锚（有记录会话时渲染，hero.flex 条目据此隐藏）
    const UTILITIES_SLOT_SEL = '[data-slot="conversation.session.header.utilities"]'

    let ctxRef

    /**
     * 重绘的右侧栏展开按钮。sidebarRight 面由右侧栏 bundle 在本插件 apply 之后
     * 提供，位于插件通过 ctx.get 读取的 cordis 作用域上（绝不声明为硬注入，这样
     * 没有该 bundle 的运行时也正常工作）。面板展开时隐藏自身，与 shell 自带按钮
     * 行为一致。
     */
    function ExpandButton() {
      const [expanded, setExpanded] = React.useState(false)
      const [sidebar, setSidebar] = React.useState(undefined)

      // 渲染期轮询解析跨插件 sidebarRight 面（可能在本插件之后才激活）。
      React.useEffect(function () {
        let alive = true
        let tries = 0
        const read = function () {
          if (!alive) return
          let value
          try {
            value = ctxRef && typeof ctxRef.get === 'function'
              ? ctxRef.get('sidebarRight', false)
              : undefined
          } catch (e) {
            value = undefined
          }
          if (value !== undefined) {
            setSidebar(value)
            return
          }
          tries += 1
          if (tries < 40) setTimeout(read, 250)
        }
        read()
        return function () { alive = false }
      }, [])

      // 面板展开状态跟随 shell 自带标记。
      React.useEffect(function () {
        const probe = function () {
          setExpanded(document.querySelector('[' + SIDEBAR_OPEN_ATTR + ']') !== null)
        }
        probe()
        const observer = new MutationObserver(probe)
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: [SIDEBAR_OPEN_ATTR] })
        window.addEventListener('resize', probe)
        return function () {
          observer.disconnect()
          window.removeEventListener('resize', probe)
        }
      }, [])

      if (expanded) return null
      return h(Tooltip, { label: '展开右侧栏', side: 'bottom', delayMs: 500 },
        h('button', {
          type: 'button',
          className: 'hf-expand',
          'aria-label': '展开右侧栏',
          'data-sidebar-right-expand': '',
          onClick: function () { if (sidebar && sidebar.toggleExpanded) sidebar.toggleExpanded() }
        },
          h(IconPanelLeftOutlineRegular, { className: 'hf-expand-icon' })
        )
      )
    }

    /**
     * Hero flex 行：插件可追加的 hero.flex 条目（按 order 升序）+ 右侧重绘的
     * 展开按钮。有记录会话时 utilities 座位渲染，hero.flex 条目隐藏（避免与
     * 标题栏功能图标重复），只留展开按钮。会话作用域子条目自动获得标准
     * session kit（sessionId、useSession、useSessions 等）。
     */
    function HeroFlexRow(props) {
      const [utilitiesPresent, setUtilitiesPresent] = React.useState(false)

      React.useEffect(function () {
        const probe = function () {
          setUtilitiesPresent(document.querySelector(UTILITIES_SLOT_SEL) !== null)
        }
        probe()
        const observer = new MutationObserver(probe)
        observer.observe(document.body, { childList: true, subtree: true })
        return function () { observer.disconnect() }
      }, [])

      return h('div', { className: 'hf-row', 'data-hero-flex': '' },
        !utilitiesPresent ? props.renderSlot('hero.flex', {}) : null,
        h(ExpandButton)
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctxRef = ctx

        // 注入样式（每次激活一次性；卸载时移除）。
        ctx.effect(function () {
          const tagId = 'dsh-hero-flex/styles'
          let style = document.querySelector('style[data-plugin-css="' + tagId + '"]')
          if (style === null) {
            style = document.createElement('style')
            style.dataset.plugin = 'dsh-hero-flex'
            style.dataset.pluginCss = tagId
            document.head.appendChild(style)
          }
          style.textContent = (
            '.hf-row{display:flex;align-items:center;gap:8px}' +
            '.hf-expand{width:28px;height:28px;color:var(--dsw-alias-label-secondary,#9ca3af);cursor:pointer;background:transparent;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;padding:6px;display:inline-flex}' +
            '.hf-expand:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.15))}' +
            '.hf-expand-icon{transform:scaleX(-1)}'
          )
          return function () { if (style) style.remove() }
        }, 'dsh-hero-flex: styles')

        // 接管 header 的 corner 座位（priority -1 = 最低 shadowing 优先级，
        // single 座位只有它渲染），并声明 hero.flex 子槽位。
        ctx.slots.inject('conversation.session.header.corner', function () {
          return ctx.slots.register(
            {
              name: 'conversation.session.header.corner',
              priority: -1,
              label: 'Hero 右上角 flex',
              children: { 'hero.flex': { kind: 'list', scope: 'session' } }
            },
            HeroFlexRow
          )
        })
      }
    }
  }
})
