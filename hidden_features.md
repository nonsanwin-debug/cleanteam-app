# 숨김 기능 관리 대장 (NEXUS)

이 문서는 서비스의 운영 흐름상 현재 필요하지 않아 소스 코드 레벨에서 일시적으로 숨김(비활성화) 처리한 기능들의 목록과 향후 필요 시 복구하는 방법에 대해 기록한 관리 대장입니다.

---

## 1. 실시간 숨김 기능 목록

### ① 관리자 사이드바 메뉴: [홍보 관리]
* **목적**: 불필요한 홍보 관리 메뉴 노출 방지 및 화면 간소화.
* **숨김 위치**: `src/components/admin/admin-nav-links.tsx`
* **소스 코드 라인**: `NAV_ITEMS` 배열 내 `/admin/promotion` 항목
* **숨김 처리 방식**: 주석 처리 (`//`)

### ② 설정 페이지: [🌐 홍보 페이지 (포트폴리오)] 설정 카드
* **목적**: 현재 사용하지 않는 포트폴리오 생성 및 웹페이지 활성화 설정을 화면에서 숨김.
* **숨김 위치**: `src/app/(admin)/admin/settings/page.tsx`
* **소스 코드 라인**: 약 223 ~ 298 라인 부근
* **숨김 처리 방식**: JSX 주석 처리 (`{/* ... */}`)

---

## 2. 향후 기능 복구(노출) 방법

### ① [홍보 관리] 메뉴 복구 방법
1. [admin-nav-links.tsx](file:///c:/Users/UserPC/Desktop/cleanteam/src/components/admin/admin-nav-links.tsx) 파일을 엽니다.
2. `NAV_ITEMS` 배열 내 아래 주석으로 처리된 라인을 찾습니다.
   ```typescript
   // { href: '/admin/promotion', icon: Camera, label: '홍보 관리', iconColor: 'text-sky-500' },
   ```
3. 맨 앞의 주석 기호(`// `)를 지우고 저장하면 즉시 복구됩니다.
   ```typescript
   { href: '/admin/promotion', icon: Camera, label: '홍보 관리', iconColor: 'text-sky-500' },
   ```

### ② [🌐 홍보 페이지 (포트폴리오)] 설정 카드 복구 방법
1. [settings/page.tsx](file:///c:/Users/UserPC/Desktop/cleanteam/src/app/(admin)/admin/settings/page.tsx) 파일을 엽니다.
2. 약 223 라인 부근에 있는 주석 시작 기호 `{/*` 와 약 298 라인 부근에 있는 주석 종료 기호 `*/}` 를 찾습니다.
3. 해당 주석 기호(`{/*` 와 `*/}`)를 통째로 지우고 저장하면 즉시 복구됩니다.
