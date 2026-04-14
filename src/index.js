import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const KAKAO_REFRESH_TOKEN = process.env.KAKAO_REFRESH_TOKEN;
const OPENSUBTITLES_API_KEY = process.env.OPENSUBTITLES_API_KEY;
const OPENSUBTITLES_USERNAME = process.env.OPENSUBTITLES_USERNAME;
const OPENSUBTITLES_PASSWORD = process.env.OPENSUBTITLES_PASSWORD;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// SRT 파일에서 대사만 추출
function parseSrt(srtText) {
  const lines = srtText.split('\n');
  const dialogues = [];
  let currentDialogue = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentDialogue.length > 0) {
        dialogues.push(currentDialogue.join(' '));
        currentDialogue = [];
      }
    } else if (/^\d+$/.test(trimmed) || /-->/.test(trimmed)) {
      continue;
    } else {
      const clean = trimmed.replace(/<[^>]+>/g, '').trim();
      if (clean) currentDialogue.push(clean);
    }
  }

  return dialogues.filter(d => d.length > 20 && d.length < 150);
}

const SHOWS = ['friends', 'the office', 'modern family', 'how i met your mother', 'seinfeld'];

// 1. OpenSubtitles에서 랜덤 대사 3개 가져오기
async function getRandomDialogues() {
  const loginRes = await fetch('https://api.opensubtitles.com/api/v1/login', {
    method: 'POST',
    headers: { 'Api-Key': OPENSUBTITLES_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: OPENSUBTITLES_USERNAME, password: OPENSUBTITLES_PASSWORD }),
  });
  const { token } = await loginRes.json();

  const show = SHOWS[Math.floor(Math.random() * SHOWS.length)];
  const page = Math.floor(Math.random() * 10) + 1;
  const searchRes = await fetch(
    `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(show)}&type=episode&languages=en&page=${page}`,
    { headers: { 'Api-Key': OPENSUBTITLES_API_KEY, 'Content-Type': 'application/json' } }
  );
  const searchData = await searchRes.json();
  const subtitle = searchData.data[Math.floor(Math.random() * searchData.data.length)];
  const fileId = subtitle.attributes.files[0].file_id;
  const episode = subtitle.attributes.feature_details.movie_name;

  const downloadRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
    method: 'POST',
    headers: { 'Api-Key': OPENSUBTITLES_API_KEY, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ file_id: fileId }),
  });
  const { link } = await downloadRes.json();

  const srtRes = await fetch(link);
  const srtText = await srtRes.text();
  const dialogues = parseSrt(srtText);

  // 랜덤으로 10개 추출 (Claude가 그 중 좋은 3개 선별)
  const shuffled = dialogues.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 10);

  return { dialogues: selected, episode };
}

// 2. Claude API로 대사 분석
async function analyzeDialogues(dialogues, episode) {
  const dialogueList = dialogues.map((d, i) => `${i + 1}. "${d}"`).join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `아래는 시트콤 자막에서 추출한 영어 대사 후보 10개야.
출처: ${episode}
후보 대사:
${dialogueList}

[1단계] 아래 기준으로 학습에 적합한 대사 3개만 골라줘:
- 실생활 대화에서 실제로 쓰이는 자연스러운 문장
- 고유명사, 의상 이름, 줄거리에만 종속된 문장 제외
- 중고급 학습자에게 배울 만한 표현이 포함된 문장 우선

[2단계] 선별한 3개를 아래 형식으로 분석해줘.
대상: 해외 3년 거주 경험이 있는 중고급 한국인 영어 학습자. 기초 표현은 이미 알고 있음.

반드시 아래 형식 그대로 답변해. 다른 말은 하지 마.
중요: **, *, #, __ 같은 마크다운 문법은 절대 사용하지 마. 카카오톡에서 그대로 보이기 때문에 일반 텍스트로만 작성해.

===QUIZ===
🤔 이걸 영어로 어떻게 말할까요?
(출처: ${episode})

1. [선별한 대사 1의 자연스러운 한국어 번역. 직역 말고 뉘앙스가 살아있는 번역]
2. [선별한 대사 2의 자연스러운 한국어 번역]
3. [선별한 대사 3의 자연스러운 한국어 번역]

생각해보고 다음 메시지를 확인하세요!
===ANSWER===
📺 출처: ${episode}

📝 정답:
1. "[선별한 대사 1 원문]"
2. "[선별한 대사 2 원문]"
3. "[선별한 대사 3 원문]"

💡 핵심 표현:
[3개 대사 각각에서 배울 만한 중고급 표현을 골고루. 관용구, 뉘앙스가 있는 표현, 원어민이 즐겨 쓰는 표현. "- 표현 : 뉘앙스와 쓰임새 설명" 형식]

✏️ 실생활 예문:
[핵심 표현을 활용한 예문 5개. 교과서 문장 말고 원어민이 실제 대화에서 쓸 법한 자연스러운 문장으로. "- 영어 (한국어)" 형식]`,
      },
    ],
  });

  return message.content[0].text;
}

// 카카오 액세스 토큰 갱신
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
  return data.access_token;
}

// 9000바이트 이내로 자르기 (카카오 텍스트 제한)
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

// 3. 카카오톡으로 전송
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

async function notifyError(error) {
  try {
    const accessToken = await refreshKakaoAccessToken();
    await sendKakaoMessage(`⚠️ 오늘의 영어 표현 전송 실패\n\n${error.message}`, accessToken);
  } catch (e) {
    console.error('에러 알림 전송도 실패:', e.message);
  }
}

// 메인 실행
(async () => {
  console.log('카카오 토큰 갱신 중...');
  const accessToken = await refreshKakaoAccessToken();
  console.log('토큰 갱신 완료');

  console.log('대사 가져오는 중...');
  const { dialogues, episode } = await getRandomDialogues();
  console.log(`에피소드: ${episode}`);
  console.log(`대사:\n${dialogues.join('\n')}`);

  console.log('\nClaude 분석 중...');
  const analysis = await analyzeDialogues(dialogues, episode);
  const message = '📚 오늘의 영어 표현\n\n' + analysis;
  console.log('\n' + message);

  console.log('\n카카오톡 전송 중...');
  const quizMarker = '===QUIZ===';
  const answerMarker = '===ANSWER===';
  const quizIndex = analysis.indexOf(quizMarker);
  const answerIndex = analysis.indexOf(answerMarker);

  if (quizIndex !== -1 && answerIndex !== -1) {
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: true });
    const quizContent = analysis.slice(quizIndex + quizMarker.length, answerIndex).trim();
    const answerContent = analysis.slice(answerIndex + answerMarker.length).trim();

    const quizMessage = `📚 오늘의 영어 표현 (${now})\n\n` + quizContent;
    const result1 = await sendKakaoMessage(quizMessage, accessToken);
    console.log('1번 전송 결과:', result1);
    const result2 = await sendKakaoMessage(answerContent, accessToken);
    console.log('2번 전송 결과:', result2);

    // 오늘 세션 데이터 저장
    const dataDir = path.resolve('data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

    const todayFile = path.join(dataDir, 'today.json');
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

    let todayData = { date: today, sessions: [] };
    if (fs.existsSync(todayFile)) {
      const saved = JSON.parse(fs.readFileSync(todayFile, 'utf-8'));
      if (saved.date === today) todayData = saved;
    }

    // 핵심 표현 추출 (💡 핵심 표현: ~ ✏️ 실생활 예문: 사이)
    const exprStart = answerContent.indexOf('💡 핵심 표현:');
    const exprEnd = answerContent.indexOf('✏️ 실생활 예문:');
    const keyExpressions = exprStart !== -1 && exprEnd !== -1
      ? answerContent.slice(exprStart, exprEnd).trim()
      : '';

    // 한국어 힌트 추출 (퀴즈 섹션에서 1. 2. 3. 라인)
    const koreanHints = quizContent
      .split('\n')
      .filter(l => /^\d\./.test(l.trim()))
      .map(l => l.trim());

    todayData.sessions.push({ time: now, episode, dialogues, koreanHints, keyExpressions });
    fs.writeFileSync(todayFile, JSON.stringify(todayData, null, 2));
    console.log('today.json 저장 완료');
  } else {
    const result = await sendKakaoMessage(message, accessToken);
    console.log('전송 결과:', result);
  }
})().catch(async (error) => {
  console.error('에러 발생:', error.message);
  await notifyError(error);
  process.exit(1);
});
