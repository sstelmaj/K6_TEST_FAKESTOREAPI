import http from 'k6/http';
export default function() {
  const res = http.post('https://fakestoreapi.com/auth/login',
    JSON.stringify({username:'johnd',password:'m38rmF$'}),
    {headers:{'Content-Type':'application/json'}});
  console.log('VALID   => STATUS: ' + res.status + ' | BODY: ' + res.body);

  const res2 = http.post('https://fakestoreapi.com/auth/login',
    JSON.stringify({username:'fake_user',password:'fake'}),
    {headers:{'Content-Type':'application/json'}});
  console.log('INVALID => STATUS: ' + res2.status + ' | BODY: ' + res2.body);
}
