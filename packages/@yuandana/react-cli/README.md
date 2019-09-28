# @yuandana/react-cli

## 本地开发

npm link

react create [project name]

## 说明文档

### react 命令开始函数，用户定义 react 命令的执行函数

bin/react.js

### lib/create.js

react create [projectName] 的命令函数
判断基本环境信息及目录信息后，
创建 ProjectGenerator 实例，
并调用 ProjectGenerator.create()函数开始整个项目目录的创建工程

### lib/project-generator.js 项目生成器类函数

项目功能创建的类函数
create 内置开始执行函数
