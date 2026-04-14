const API_KEY = process.env.OPENSUBTITLES_API_KEY;
const USERNAME = process.env.OPENSUBTITLES_USERNAME;
const PASSWORD = process.env.OPENSUBTITLES_PASSWORD;

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

(async () => {
  // 1. 로그인 (JWT 토큰 발급)
  const loginRes = await fetch('https://api.opensubtitles.com/api/v1/login', {
    method: 'POST',
    headers: { 'Api-Key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('로그인 성공:', !!token);

  // 2. 랜덤 Friends 에피소드 자막 검색
  const page = Math.floor(Math.random() * 10) + 1;
  const searchRes = await fetch(
    `https://api.opensubtitles.com/api/v1/subtitles?query=friends&type=episode&languages=en&page=${page}`,
    { headers: { 'Api-Key': API_KEY, 'Content-Type': 'application/json' } }
  );
  const searchData = await searchRes.json();
  const subtitle = searchData.data[Math.floor(Math.random() * searchData.data.length)];
  const fileId = subtitle.attributes.files[0].file_id;
  const episode = subtitle.attributes.feature_details.movie_name;
  console.log('선택된 에피소드:', episode);

  // 3. 다운로드 URL 요청
  const downloadRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
    method: 'POST',
    headers: { 'Api-Key': API_KEY, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ file_id: fileId }),
  });
  const downloadData = await downloadRes.json();

  if (!downloadData.link) {
    console.log('다운로드 링크 없음:', downloadData);
    return;
  }

  // 4. 자막 파일 다운로드 및 파싱
  const srtRes = await fetch(downloadData.link);
  const srtText = await srtRes.text();
  const dialogues = parseSrt(srtText);

  // 5. 랜덤 대사 출력
  const randomLine = dialogues[Math.floor(Math.random() * dialogues.length)];
  console.log('\n랜덤 대사:', randomLine);
})();
