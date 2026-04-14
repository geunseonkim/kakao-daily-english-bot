# Daily English Kakao

매일 시트콤 대사 기반 영어 표현을 카카오톡으로 자동 전송하는 프로젝트.

## 기능

- 하루 3번 (오전 8시, 오후 1시, 오후 7시) 시트콤 대사 기반 영어 표현 전송
- 밤 11시 그날 배운 표현 복습 메시지 전송
- 퀴즈 형식: 한국어 힌트 메시지 → 정답 + 핵심 표현 + 실생활 예문 메시지
- Friends, The Office, Modern Family, How I Met Your Mother, Seinfeld 중 랜덤 선택

## 메시지 예시

**1번 메시지 (퀴즈)**
```
📚 오늘의 영어 표현 (AM 08:00)

🤔 이걸 영어로 어떻게 말할까요?
(출처: Friends - S05E23 The One in Vegas)

1. 그냥 넘어갈게.
2. 위로가 될지 모르겠지만, 나도 오늘 정말 힘들었어.
3. 진짜야, 나 거기 못 들어가겠어.

생각해보고 다음 메시지를 확인하세요!
```

**2번 메시지 (정답)**
```
📺 출처: Friends - S05E23 The One in Vegas

📝 정답:
1. "I'm just gonna let that one go."
2. "Well, if it's any consolation, I had a really terrible day too."
3. "I'm telling you, I can't go in there."

💡 핵심 표현:
- let it go : 그냥 넘기다, 신경 끄다
- if it's any consolation : 위로가 될지 모르겠지만

✏️ 실생활 예문:
...
```

## 기술 스택

- **Node.js** — 메인 런타임
- **OpenSubtitles API** — 시트콤 자막 수집
- **Claude API** (claude-sonnet-4-5) — 대사 분석 및 번역
- **카카오 메시지 API** — 카카오톡 전송
- **GitHub Actions** — 스케줄 자동 실행

## 설치 및 실행

### 1. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일에 아래 값들을 채워넣는다.

| 변수 | 발급처 |
|------|--------|
| `KAKAO_REST_API_KEY` | [카카오 개발자 콘솔](https://developers.kakao.com) > 앱 키 |
| `KAKAO_CLIENT_SECRET` | 카카오 개발자 콘솔 > 보안 |
| `KAKAO_REFRESH_TOKEN` | `node scripts/get-token.js` 실행 후 발급 |
| `OPENSUBTITLES_API_KEY` | [OpenSubtitles](https://www.opensubtitles.com/consumers) |
| `OPENSUBTITLES_USERNAME` | OpenSubtitles 계정 아이디 |
| `OPENSUBTITLES_PASSWORD` | OpenSubtitles 계정 비밀번호 |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) |

### 2. 카카오 토큰 발급

```bash
# 1. 브라우저에서 아래 URL 접속 후 code 값 복사
# https://kauth.kakao.com/oauth/authorize?client_id={REST_API_KEY}&redirect_uri=https://localhost&response_type=code

# 2. get-token.js의 code 값 교체 후 실행
node scripts/get-token.js

# 3. 출력된 refresh_token을 .env의 KAKAO_REFRESH_TOKEN에 저장
```

### 3. 실행

```bash
npm install

# 영어 표현 전송
node --env-file=.env src/index.js

# 복습 메시지 전송
node --env-file=.env src/review.js
```

## GitHub Actions 배포

1. GitHub 레포 생성 후 푸시
2. 레포 Settings > Secrets > Actions에 `.env`의 값들 등록
3. Actions 탭에서 워크플로우 활성화

스케줄은 `.github/workflows/daily.yml`에서 수정 가능.

| 실행 시각 (KST) | cron (UTC) |
|----------------|------------|
| 오전 8시 | `0 23 * * *` (전날) |
| 오후 1시 | `0 4 * * *` |
| 오후 7시 | `0 10 * * *` |
| 오후 11시 (복습) | `0 14 * * *` |

## 주의사항

- 카카오 리프레시 토큰은 **2달**마다 만료. 만료 시 `scripts/get-token.js` 재실행 필요.
- OpenSubtitles 무료 플랜은 하루 **100회** 다운로드 제한.
