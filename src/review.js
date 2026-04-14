import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const KAKAO_REFRESH_TOKEN = process.env.KAKAO_REFRESH_TOKEN;

async function refreshKakaoAccessToken() {
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KAKAO_REST_API_KEY,
      client_secret: KAKAO_CLIENT_SECRET,
      refresh_token: KAKAO_REFRESH_TOKEN,
    }).toString(),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`토큰 갱신 실패: ${JSON.stringify(data)}`);

  if (data.refresh_token && process.env.GH_PAT) {
    const result = spawnSync('gh', ['secret', 'set', 'KAKAO_REFRESH_TOKEN', '--body', data.refresh_token], {
      env: { ...process.env, GH_TOKEN: process.env.GH_PAT },
    });
    if (result.status === 0) {
      console.log('리프레시 토큰 자동 갱신 완료');
    } else {
      console.error('리프레시 토큰 갱신 실패:', result.stderr?.toString());
    }
  }

  return data.access_token;
}

function truncateToByteLimit(text, limit = 8900) {
  const encoder = new TextEncoder();
  let bytes = 0;
  let i = 0;
  for (const char of text) {
    bytes += encoder.encode(char).length;
    if (bytes > limit) break;
    i += char.length;
  }
  return text.slice(0, i);
}

async function sendKakaoMessage(text, accessToken) {
  text = truncateToByteLimit(text);
  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      template_object: JSON.stringify({
        object_type: 'text',
        text,
        link: { web_url: 'https://kakao.com' },
      }),
    }).toString(),
  });
  return res.json();
}

(async () => {
  const todayFile = path.resolve('data/today.json');
  if (!fs.existsSync(todayFile)) {
    console.log('today.json 없음. 오늘 세션 데이터가 없습니다.');
    process.exit(0);
  }

  const todayData = JSON.parse(fs.readFileSync(todayFile, 'utf-8'));
  const { sessions } = todayData;

  if (!sessions || sessions.length === 0) {
    console.log('오늘 세션 없음.');
    process.exit(0);
  }

  // 복습 메시지 생성
  let reviewMessage = '🔁 오늘의 영어 복습\n\n오늘 배운 표현들을 다시 떠올려보세요!\n';

  for (const session of sessions) {
    reviewMessage += `\n──────────────\n`;
    reviewMessage += `${session.time} (${session.episode})\n\n`;
    reviewMessage += `이걸 영어로 말할 수 있나요?\n`;
    session.koreanHints.forEach(hint => {
      reviewMessage += `${hint}\n`;
    });
  }

  reviewMessage += '\n──────────────\n오늘도 수고했어요!';

  console.log(reviewMessage);

  console.log('\n카카오 토큰 갱신 중...');
  const accessToken = await refreshKakaoAccessToken();

  const result = await sendKakaoMessage(reviewMessage, accessToken);
  console.log('복습 메시지 전송 결과:', result);
})().catch(async (error) => {
  console.error('에러 발생:', error.message);
  try {
    const accessToken = await refreshKakaoAccessToken();
    await sendKakaoMessage(`⚠️ 오늘의 영어 복습 전송 실패\n\n${error.message}`, accessToken);
  } catch (e) {
    console.error('에러 알림 전송도 실패:', e.message);
  }
  process.exit(1);
});
