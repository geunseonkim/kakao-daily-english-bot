const accessToken = process.env.KAKAO_ACCESS_TOKEN;

(async () => {
  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      template_object: JSON.stringify({
        object_type: 'text',
        text: '📚 오늘의 영어 표현\n\n원문 (Friends S02E05):\n"I\'m not great at the advice. Can I interest you in a sarcastic comment?"\n\n🇰🇷 번역:\n"나 조언은 잘 못해. 대신 비꼬는 말 한마디 해줄까?"\n\n💡 핵심 표현:\n- be great at ~ : ~를 잘하다\n- interest you in ~ : ~를 권하다\n\n✏️ 활용 예문:\n"I\'m not great at cooking, but I can order great takeout."',
        link: { web_url: 'https://kakao.com' },
      }),
    }).toString(),
  });

  const data = await res.json();
  console.log(data);
})();
