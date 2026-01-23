# ElysiaJS VS Code Extension

This is the comprehensive VS Code extension for [ElysiaJS](https://elysiajs.com/) developers.
Initially focusing on **Route Visualization**, it aims to provide a full suite of tools for ElysiaJS development.

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

### 0.0.7

- **Production Ready**: Fixed critical packaging and build errors
- **Stabilization**: Resolved "No registered data providers" TreeView error
- Improved extension activation reliability

See [CHANGELOG.md](CHANGELOG.md) for detailed release history.

### 0.0.4

- **Critical Bug Fix**: Fixed TreeView not displaying in production builds
- Resolved async timing issue in extension activation
- Improved extension lifecycle management

See [CHANGELOG.md](CHANGELOG.md) for detailed release history.

### 0.0.3

- Enhanced workspace scanning
- Added automatic ElysiaJS project detection

### 0.0.2

- Added extension icon and .vscodeignore
- Updated package.json dependencies

### 0.0.1

- Initial release
- Static analysis of routes
- Support for groups and prefixes

---

# ElysiaJS VS Code 확장 프로그램 (Korean Version)

이것은 [ElysiaJS](https://elysiajs.com/) 개발자를 위한 종합 VS Code 확장 프로그램입니다.
초기 버전은 **라우트 시각화**에 집중하고 있으며, 향후 ElysiaJS 개발을 위한 다양한 도구를 제공할 예정입니다.

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

### 0.0.7

- **배포 안정화**: 패키징 및 빌드 관련 중요 오류 수정
- **안정성 개선**: "No registered data providers" TreeView 오류 해결
- 확장 프로그램 활성화 및 초기화 로직 개선

자세한 릴리스 내역은 [CHANGELOG.md](CHANGELOG.md)를 참조하세요.

### 0.0.4

- **중요 버그 수정**: 배포 버전에서 TreeView가 표시되지 않던 문제 해결
- 확장 활성화 시 비동기 타이밍 이슈 수정
- Extension 생명주기 관리 개선

자세한 릴리스 내역은 [CHANGELOG.md](CHANGELOG.md)를 참조하세요.

### 0.0.3

- 워크스페이스 스캔 개선
- ElysiaJS 프로젝트 자동 감지 기능 추가

### 0.0.2

- 확장 아이콘 및 .vscodeignore 추가
- package.json 의존성 업데이트

### 0.0.1

- 초기 릴리스
- 라우트 정적 분석 기능
- 그룹 및 접두사(Prefix) 지원

---

**Enjoy building with Elysia!**
