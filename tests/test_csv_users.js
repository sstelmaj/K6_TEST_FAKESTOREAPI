import http from 'k6/http';

const users = [
  { username: 'donero', password: 'ewedon' },
  { username: 'kevinryan', password: 'kev02937@' },
  { username: 'johnd', password: 'm38rmF$' },
  { username: 'derek', password: 'jklg*_56' },
  { username: 'mor_2314', password: '83r5^_' },
];

export default function () {
  for (const u of users) {
    const res = http.post(
      'https://fakestoreapi.com/auth/login',
      JSON.stringify({ username: u.username, password: u.password }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const ok = (res.status >= 200 && res.status < 300) ? 'OK  ' : 'FAIL';
    console.log(ok + ' | ' + u.username + ':' + u.password + ' => ' + res.status + ' | ' + res.body.substring(0, 60));
  }
}
