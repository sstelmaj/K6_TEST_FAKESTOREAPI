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
    const status = res.status === 201 ? 'OK' : 'FAIL';
    console.log(status + ' | ' + u.username + ' => ' + res.status + ' | ' + res.body.substring(0, 80));
  }
}
