<!--
 * @Author: your name
 * @Date: 2020-03-14 17:21:08
 * @LastEditTime: 2020-03-14 22:44:43
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \DevUI-Language-Support\CHANGELOG.md
 -->
## 2020/3/14 V0.2.0

### 完成点：
- 使用了angular-language-support架构
- 添加了拦截器功能，现在在没有DevUI依赖的文件夹中，插件将不会被激活。
- 使用rollup对项目进行打包，减少了代码冗余。
- 添加了Logo License 以CHANGELOG.md

### BUGS:
- 使用人工打包而非批处理打包，java文件无法满足自动打包功能。
- 似乎disableLanguageService()函数并没有起作用，也许只在DEBUG情境下才这样
- 仍然没有添加对typescript语法的支持
- package.json文件中的main在DEBUG模式与生产模式中不同，这是否是打包批处理文件应该完成的工作？

## 2020/3/12 V0.1.0

完成点：

- 完成最小可用产品，能够在html中实现大类标签提示。

BUGS：

- 在所有的html中都会提示。冗余严重

下一步要做的事：

- 完成大类中api的提示
- 完成启动控制器，仅当发现ng-devui插件时启动提示功能。

## 2020/3/11 V0.0.1

完成点：

正式登陆vscode 完成在商店中发布

BUGS：

无法运行，初始化失败，怀疑是session类的BUG

下一步要做的事：

发布最小可用产品。