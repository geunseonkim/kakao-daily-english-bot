import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const dialogue = 'YES, HELLO, I HAVE A QUESTION.';
const episode = 'Friends - S05E23 The One in Vegas';

(async () => {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `아래 영어 대사를 한국인 영어 학습자를 위해 분석해줘.
출처: ${episode}
대사: "${dialogue}"

반드시 아래 형식 그대로 답변해. 다른 말은 하지 마.

원문 (${episode}):
"${dialogue}"

🇰🇷 번역:
[자연스러운 한국어 번역]

💡 핵심 표현:
[대사에서 배울 만한 표현 2~3개, "- 표현 : 설명" 형식]

✏️ 활용 예문:
[핵심 표현을 활용한 새로운 영어 예문 1개]`,
      },
    ],
  });

  const result = message.content[0].text;
  console.log('📚 오늘의 영어 표현\n\n' + result);
})();
