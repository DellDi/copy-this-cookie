# CopyThisCookie

基于 [EditThisCookie](https://github.com/fcapano/Edit-This-Cookie) 的 Chrome Cookie 管理扩展定制版,重绘为 **Claude 橙 + 玻璃拟态** 风格的现代化 UI。

## 功能

- 查看、编辑、删除、新增任意 Cookie
- 搜索 Cookie、保护 Cookie(只读)、屏蔽 Cookie(过滤规则)
- 导出:JSON / Netscape Cookie File(适用于 wget、curl)/ Perl::LWP
- 导入:JSON 格式批量导入
- **复制到本地调试**:导出时自动将 cookie 的 domain 统一替换为 `127.0.0.1` 并直接写入本地环境,本地调试开箱即用
- 限制网站 Cookie 的最大有效期
- DevTools 面板:表格化批量管理当前站点 Cookie
- 站点统计:popup 顶部显示当前站点域名、Cookie 总数与受保护数

## 定制说明(相对原版)

- **Claude 橙玻璃拟态 UI**:共享设计令牌(`css/theme.css`),popup、选项页、DevTools 面板全面重绘;半透明玻璃表面 + 模糊背景 + 橙色强调
- **首次使用引导**:首次打开显示操作提示条;空站点展示引导卡片;选项页导航带用途说明
- **工具栏按钮默认显示文字标签**,提交按钮改为带文字的胶囊按钮
- **修复 i18n 失效**:新版本 Chrome 移除了 `chrome.extension.getURL`,导致原版所有界面文字空白;已改为异步加载语言文件 + `chrome.runtime.getURL`(Chrome 151 实测通过)
- **本地调试复制(基于原版的修复)**:测试/开发环境域名更改后,原版导出的 Cookie 域名对不上,本地调试无法使用;本插件在 Copy(导出)时自动把 Cookie 的 domain 统一替换为 `127.0.0.1` 并直接导入本地,域名再怎么变,本地调试环境都能直接复用
- 修复 popup 中新增/粘贴面板初始隐藏、toast 居中等问题

## 安装(开发模式)

1. 打开 `chrome://extensions`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」,选择本目录
4. 将扩展固定到工具栏,点击图标即可使用

## 目录结构

```
css/theme.css               # 共享设计令牌(颜色、玻璃、表单控件)
css/popup.css               # popup 样式
css/popup-accordion.css     # Cookie 折叠列表样式
css/options_main_page.css   # 选项页外壳(导航 + 内容区)
options_pages/              # 选项页(偏好/屏蔽规则/保护规则/支持)
devtools/                   # DevTools 面板
js/                         # popup、数据、工具逻辑
lib/                        # 第三方库与 i18n 加载器
preview.html                # 本地静态 UI 预览页(不参与插件运行)
```

## 预览

浏览器直接打开 `preview.html`(需本地 HTTP 服务)即可预览各界面效果,无需加载扩展。

## 协议

GPL v3(继承自 EditThisCookie)。
