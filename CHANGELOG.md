# Change Log

All notable changes to the "elysia-vscode" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-01-24

### 🇺🇸 English

#### Fixed

- **Parser Type Safety**: Resolved a TypeScript type mismatch error in `parser.ts` where `parentVar` was missing from the `usages` array definition.

### 🇰🇷 Korean

#### Fixed (수정)

- **Parser 타입 안정성**: `parser.ts`의 `usages` 배열 정의에서 `parentVar` 속성이 누락되어 발생하던 TypeScript 타입 불일치 오류 수정

## [0.0.10] - 2026-01-23

### 🇺🇸 English

#### Fixed

- **Route Path Normalization**: Fixed an issue where routes without a leading slash (e.g., `.get('info')`) were displayed incorrectly.
- **Empty Path Handling**: Fixed an issue where empty route paths (e.g., `.get('')`) were generating unwanted trailing slashes. All paths are now correctly normalized and joined.
- **Parser Robustness**: Improved `parser.ts` with `normalizePath` and `joinPaths` helpers for safer AST traversal.

### 🇰🇷 Korean

#### Fixed (수정)

- **라우트 경로 정규화**: 슬래시 없이 정의된 라우트(예: `.get('info')`)가 View에서 올바르게 표시되지 않던 문제 수정
- **빈 경로 처리 개선**: 빈 문자열 경로(`.get('')`) 사용 시 불필요한 Trailing Slash가 붙던 문제 해결
- **Parser 안정성 강화**: `normalizePath` 및 `joinPaths` 헬퍼 도입으로 경로 결합 로직의 안정성 개선

## [0.0.9] - 2026-01-23

### 🇺🇸 English

#### Added

- **Nested Routes Support**: Added ability to resolve routes imported via `.use()`.
- **Navigation to Definition**: Clicking a nested route now opens the original definition file.
- **Route Deduplication**: Helper routes that are consumed by other files are hidden from the top-level view.

### 🇰🇷 Korean

#### Added (추가)

- **중첩 라우트 지원**: `.use()`를 통해 가져온 라우트가 부모 프리픽스를 상속받아 표시되도록 개선
- **정의 위치로 이동**: 중첩된 라우트 클릭 시, 실제 코드가 정의된 원본 파일로 이동하는 기능 추가
- **라우트 중복 제거**: 다른 파일에서 사용된 헬퍼 라우트 모듈이 최상위 뷰에 중복 노출되지 않도록 개선

## [0.0.8] - 2026-01-23

### 🇺🇸 English

#### Added

- **Support for .guard()**: Fixed an issue where routes defined inside `.guard()` blocks were not correctly inheriting the parent prefix.

### 🇰🇷 Korean

#### Added (추가)

- **.guard() 지원**: `.guard()` 블록 내부에 정의된 라우트가 부모 프리픽스(Prefix)를 올바르게 상속하지 못하던 문제 해결

## [0.0.7] - 2026-01-23

### 🇺🇸 English

#### Fixed

- **Critical Build Fix**: Resolved `npm error missing` and build failures during packaging.
  - Optimized Webpack configuration and dependency structure.
- **TreeView Fix**: Resolved "No registered data providers" error.
  - Stabilized `TreeDataProvider` registration timing and activation logic.
  - Fixed view loading issues in production environments.

#### Technical Details

- Improved production build pipeline.
- Refined `typescript` runtime dependency handling.

### 🇰🇷 Korean

#### Fixed (수정)

- **치명적 빌드 오류 수정**: 패키징 시 발생하던 `npm error missing` 및 빌드 오류 해결
  - Webpack 설정 최적화 및 의존성 구조 개선
- **TreeView 수정**: "No registered data providers" 오류 수정
  - `TreeDataProvider` 등록 타이밍 및 activate 로직 안정화
  - 배포 환경에서의 뷰 로딩 문제 해결

#### Technical Details (기술적 세부사항)

- Production 빌드 파이프라인 개선
- `typescript` 런타임 의존성 처리 방식 개선

## [0.0.4] - 2026-01-22

### Fixed

- **Critical**: 배포 버전에서 TreeView가 표시되지 않던 문제 수정
  - `activate()` 함수를 async로 변경하여 비동기 타이밍 이슈 해결
  - `checkElysiaProject()` 완료 전에 TreeView가 등록되던 문제 해결
  - 개발 환경과 배포 환경 간의 동작 차이 제거
- Extension activation lifecycle 개선
  - `elysia:isElysiaProject` context가 설정된 후 TreeView 등록 보장
  - "보기 데이터를 제공할 수 있는 등록된 데이터 공급자가 없습니다" 오류 해결

### Technical Details

- Extension activation이 이제 완전히 비동기로 처리됨
- TreeView 등록 전 workspace 스캔 완료 보장
- VSCode Extension API의 `Thenable<void>` 패턴 준수

## [0.0.3] - 2026-01-22

### Added

- Workspace 스캔 개선
- ElysiaJS 프로젝트 자동 감지 로직 추가

### Changed

- Activity Bar에 전용 아이콘 추가
- TreeView UX 개선

## [0.0.2] - 2026-01-22

### Added

- VSCode Extension 기본 설정 완료
- 아이콘 및 .vscodeignore 추가

### Changed

- package.json 의존성 및 설정 업데이트

## [0.0.1] - 2026-01-22

### Added

- 🎉 Initial release
- ElysiaJS 라우트 정적 분석 기능
  - `.get()`, `.post()`, `.put()`, `.delete()`, `.patch()` 등 HTTP 메서드 감지
  - `.group()` 중첩 라우트 지원
  - `new Elysia({ prefix: '...' })` prefix 자동 인식
- TreeView 기반 라우트 시각화
  - 파일별 라우트 그룹화
  - 클릭 시 코드 위치로 이동
- 워크스페이스 전체 `.ts` 파일 자동 스캔
- 파일 저장 및 에디터 변경 시 자동 새로고침

### Technical Implementation

- TypeScript Compiler API를 사용한 AST 기반 정적 분석
- False positive 방지 (예: `headers.get()` 제외)
- Prefix 누적(accumulation) 알고리즘으로 전체 경로 계산

---

## Version History

- **0.0.8**: Added support for `.guard()` route prefix inheritance
- **0.0.7**: Build fixes & TreeView stabilization
- **0.0.4**: Critical bug fix - TreeView 배포 버전 오류 해결
- **0.0.3**: Workspace 스캔 개선 및 자동 감지
- **0.0.2**: Extension 기본 설정 및 아이콘 추가
- **0.0.1**: Initial release with route visualization

[0.0.8]: https://github.com/UkiDelly/elysia-vscode/compare/v0.0.7...v0.0.8
[0.0.7]: https://github.com/UkiDelly/elysia-vscode/compare/v0.0.4...v0.0.7
[0.0.4]: https://github.com/UkiDelly/elysia-vscode/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/UkiDelly/elysia-vscode/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/UkiDelly/elysia-vscode/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/UkiDelly/elysia-vscode/releases/tag/v0.0.1
