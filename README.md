# ElysiaJS Route Visualizer

This VSCode extension helps you visualize routes in your [ElysiaJS](https://elysiajs.com/) backend applications.
It statically analyzes your TypeScript code to extract routes and displays them in a dedicated tree view.

## Features

- **Route Detection**: Automatically finds `.get()`, `.post()`, and other HTTP methods.
- **Group Support**: Visualizes nested routes defined with `.group()`.
- **Prefix Support**: Respects `new Elysia({ prefix: '/...' })` configurations.
- **Multi-file Support**: Scans all `.ts` files in your workspace.
- **Navigation**: Click on a route in the tree view to jump directly to the code definition.

## Requirements

- VSCode ^1.80.0
- A TypeScript project using ElysiaJS.

## Usage

1. Open your ElysiaJS project in VSCode.
2. Click on the **Elysia Routes** icon in the Activity Bar (Side Bar).
3. The hierarchy of your routes will be displayed, grouped by file.

## Extension Settings

Currently, this extension works out-of-the-box and does not require complex configuration.

## Release Notes

### 0.0.1

- Initial release.
- Static analysis of routes.
- Support for groups and prefixes.

---

# ElysiaJS 라우트 시각화 도구 (Korean Version)

이 VSCode 확장은 [ElysiaJS](https://elysiajs.com/) 백엔드 애플리케이션의 라우트를 시각적으로 확인할 수 있도록 도와줍니다.
TypeScript 코드를 정적으로 분석하여 라우트를 추출하고, 전용 트리 뷰(Tree View)에 표시합니다.

## 주요 기능

- **라우트 자동 감지**: `.get()`, `.post()` 등의 HTTP 메서드를 자동으로 찾아냅니다.
- **그룹 지원**: `.group()`으로 정의된 중첩된 라우트 구조를 시각화합니다.
- **접두사(Prefix) 지원**: `new Elysia({ prefix: '/...' })` 설정을 인식하여 경로에 반영합니다.
- **다중 파일 지원**: 워크스페이스 내의 모든 `.ts` 파일을 스캔합니다.
- **코드 탐색**: 트리 뷰에서 라우트를 클릭하면 해당 코드가 정의된 위치로 바로 이동합니다.

## 요구 사항

- VSCode ^1.80.0
- ElysiaJS를 사용하는 TypeScript 프로젝트

## 사용 방법

1. VSCode에서 ElysiaJS 프로젝트를 엽니다.
2. 액티비티 바(사이드 바)에 있는 **Elysia Routes** 아이콘을 클릭합니다.
3. 파일별로 그룹화된 라우트 계층 구조가 표시됩니다.

## 확장 설정

현재 이 확장은 별도의 복잡한 설정 없이 바로 사용할 수 있습니다.

## 릴리스 노트

### 0.0.1

- 초기 릴리스
- 라우트 정적 분석 기능
- 그룹 및 접두사(Prefix) 지원

---

**Enjoy building with Elysia!**