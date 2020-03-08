<!--
 * @Author: your name
 * @Date: 2020-03-08 19:29:37
 * @LastEditTime: 2020-03-08 19:44:15
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \DevUI-Language-Support\README.md
 -->
# 一个基于LSP的DevUI语言组件



这个组件面向DevUI组件库的开发者，将提供有关于DevUI开源组件库的一系列帮助，包括:
1、代码提示与补全
2、代码纠错
3、悬浮提醒
4、跳转帮助
(以上内容均暂未实现)



## Structure

```
.
├── client // Language Client
│   ├── src
│   │   ├── test // End to End tests for Language Client / Server
│   │   └── extension.ts // Language Client entry point
├── package.json // The extension manifest.
└── server // Language Server
    └── src
        ├──server.ts // Language Server entry point
        └── DevUIhtmlSyntaxes.ts // DevUI语法库
```

## Running the Sample

- Run `npm install` in this folder. This installs all necessary npm modules in both the client and server folder
- Open VS Code on this folder.
- Press Ctrl+Shift+B to compile the client and server.
- Switch to the Debug viewlet.
- Select `Launch Client` from the drop down.
- Run the launch config.
- If you want to debug the server as well use the launch configuration `Attach to Server`
- In the [Extension Development Host] instance of VSCode, open a document in 'plain text' language mode.
  - Type `j` or `t` to see `Javascript` and `TypeScript` completion.
  - Enter text content such as `AAA aaa BBB`. The extension will emit diagnostics for all words in all-uppercase.

  ## DevUI

  DevUI官方网址:https://devui.design/home
  DevUI组件库:https://github.com/sspku-yqLiu/ng-devui