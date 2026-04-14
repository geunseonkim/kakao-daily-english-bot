const code = 'tK6Jg7kZbnc11s0r1YEOytGF25orEUxn9VTWre6DPeR-wDrrskaK5AAAAAQKFzVXAAABnYtqUMCSBpCp5rpDbg';
const clientId = '40a944a5b91445467a7f319db865ab1c';
const clientSecret = 'gZuka1YHvGbCxkc6zgrmr1AAsqnrLgSN';

(async () => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: 'https://localhost',
    code: code,
  });

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  console.log(data);
})();
