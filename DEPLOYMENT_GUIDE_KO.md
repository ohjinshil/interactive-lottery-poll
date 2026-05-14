# 디지털 AI 능력 UP! 복권 투표 웹앱 배포 가이드

Vercel, GitHub, Upstash Redis를 이용한 무료 MVP 배포 절차 정리입니다.

## 1. 전체 구조

- 내 컴퓨터의 프로젝트 코드를 GitHub에 올립니다.
- Vercel이 GitHub 저장소를 가져와 웹앱으로 배포합니다.
- 투표 데이터와 복권 당첨자 정보는 Upstash Redis에 저장합니다.
- 참여자 주소는 Vercel의 대표 도메인을 사용합니다.
- 관리자 화면은 대표 도메인 뒤에 `/admin`을 붙여 접속합니다.

## 2. GitHub에 올릴 파일

올릴 항목:

- `app`
- `lib`
- `next-env.d.ts`
- `next.config.mjs`
- `package.json`
- `package-lock.json`
- `PRD.md`
- `README.md`
- `tsconfig.json`

올리지 말 항목:

- `.next`
- `.tools`
- `data`
- `node_modules`
- `interactive-lottery-poll-upload` zip 또는 임시 폴더

중요: `app` 폴더와 `lib` 폴더는 폴더째 올려야 합니다. `page.tsx`, `route.ts`, `store.ts` 같은 파일만 루트에 낱개로 올리면 안 됩니다.

## 3. GitHub 저장소 만들기

- GitHub에서 새 저장소를 만듭니다.
- 저장소 이름은 `interactive-lottery-poll`을 권장합니다.
- README 생성 옵션은 체크하지 않는 것이 좋습니다.
- `Add file > Upload files`를 눌러 프로젝트 파일을 업로드합니다.
- 업로드 후 `Commit changes`를 누릅니다.

## 4. 정상 GitHub 구조

루트에 `app` 폴더와 `lib` 폴더가 보여야 합니다.

정상 구조 예:

- `app/`
- `lib/`
- `package.json`
- `package-lock.json`
- `next.config.mjs`
- `tsconfig.json`
- `README.md`
- `PRD.md`

잘못된 구조 예:

- `globals.css`
- `layout.tsx`
- `page.tsx`
- `route.ts`
- `store.ts`
- `types.ts`

위 파일들이 루트에 낱개로 보이면 폴더 구조가 깨진 상태입니다.

## 5. Vercel 프로젝트 생성

- Vercel에서 `Add New > Project`를 선택합니다.
- GitHub 저장소 `interactive-lottery-poll`을 선택합니다.
- 저장소가 보이지 않으면 직접 Import URL을 사용할 수 있습니다.

```text
https://vercel.com/new/clone?repository-url=https://github.com/ohjinshil/interactive-lottery-poll
```

- 무료 배포를 위해 Hobby 플랜 또는 개인 프로젝트를 선택합니다.
- Pro나 결제 정보 요구 화면이 나오면 멈추고 Hobby 흐름으로 돌아갑니다.

## 6. Vercel 배포 설정

- Framework Preset: `Next.js`
- Root Directory: `./`
- Build Command: `next build`
- Install Command: `npm install`

설정 후 `Create` 또는 `Deploy`를 누릅니다.

## 7. 배포 주소 이해하기

Deployment 주소는 특정 배포 버전 주소입니다. 코드가 새로 배포될 때마다 달라질 수 있습니다.

Domains 주소가 실제 공유할 대표 주소입니다.

참여자 주소 예:

```text
https://interactive-lottery-poll.vercel.app
```

관리자 주소 예:

```text
https://interactive-lottery-poll.vercel.app/admin
```

## 8. Upstash Redis 생성

- Vercel 프로젝트의 Storage 또는 Marketplace Database Providers에서 `Upstash for Redis`를 선택합니다.
- `Create`를 누르고 Free 플랜을 선택합니다.
- Region은 가까운 지역을 선택합니다.
- Status가 `Available`이고 Plan이 `Free`이면 생성 완료입니다.

## 9. Redis 환경변수 연결

Vercel 프로젝트의 `Settings > Environment Variables`로 이동합니다.

아래 환경변수 2개가 반드시 필요합니다.

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Upstash가 자동으로 만든 변수명이 다를 수 있습니다.

예:

```text
UPSTASH_REDIS_REST_KV_REST_API_URL
UPSTASH_REDIS_REST_KV_REST_API_TOKEN
```

이 경우 값만 복사해서 우리 앱이 사용하는 이름으로 새 변수를 추가합니다.

## 10. 관리자 PIN 설정

Vercel 프로젝트의 `Settings > Environment Variables`에서 `ADMIN_PIN`을 추가합니다.

예:

```text
ADMIN_PIN=1234
```

관리자 화면 `/admin`에서 이 PIN을 입력해 투표를 생성합니다.

## 11. 환경변수 적용 재배포

환경변수를 추가하거나 수정한 뒤에는 반드시 재배포해야 합니다.

순서:

- Vercel 프로젝트로 이동
- `Deployments` 클릭
- 최신 배포 오른쪽 메뉴 클릭
- `Redeploy` 선택

Status가 `Ready`가 되면 적용 완료입니다.

## 12. 운영 테스트

관리자 테스트:

- `/admin`에 접속합니다.
- `ADMIN_PIN`을 입력합니다.
- 투표 제목, 설명, 선택지 이미지 2개, 리워드 이미지를 입력합니다.
- 투표를 생성합니다.

참여자 테스트:

- 대표 주소 `/`에 접속합니다.
- 투표 카드가 보이는지 확인합니다.
- 투표 후 진행 상황이 계속 보이는지 확인합니다.
- 내 복권 영역이 표시되는지 확인합니다.
- 마감 후 복권 긁기 기능으로 당첨/꽝 결과가 표시되는지 확인합니다.

## 13. 수정 및 버전업

GitHub 웹 업로드 방식:

- 로컬에서 수정한 파일을 GitHub에 다시 업로드합니다.
- `Commit changes`를 누릅니다.
- Vercel이 자동으로 새 배포를 실행합니다.

Git 사용 방식:

```bash
git add .
git commit -m "Update lottery UI"
git push
```

버전 예:

- `v0.1.0` 첫 MVP
- `v0.1.1` 문구 수정
- `v0.2.0` 복권 UX 개선
- `v1.0.0` 운영 안정 버전

## 14. 문제 발생 시 되돌리기

- Vercel 프로젝트의 `Deployments`로 이동합니다.
- 정상 작동하던 이전 배포를 선택합니다.
- `Promote to Production` 또는 `Redeploy`를 눌러 이전 버전으로 되돌릴 수 있습니다.

## 15. 완료 기준

아래가 모두 되면 배포 완료입니다.

- 대표 도메인 접속 가능
- `/admin` 접속 가능
- Redis 환경변수 연결 완료
- `ADMIN_PIN` 적용 완료
- 투표 생성 가능
- 참여자 투표 가능
- 마감 후 복권 긁기 가능
- 새로고침 후에도 데이터 유지
