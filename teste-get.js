import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '10s', target: 100 },
        { duration: '10s', target: 200 },
        { duration: '10s', target: 300 },
        { duration: '10s', target: 400 },
        { duration: '10s', target: 500 },
        { duration: '10s', target: 600 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<800'],
        checks: ['rate>0.99'],
    },
};

export default function () {
    const url = http.get('http://localhost:8089/api/departamento');

    console.log(`status: ${url.status}`);
    console.log(`body: ${url.body}`);

    check(url, {
        'Status 200': (r) => r.status === 200,
        'Corpo não vazio': (r) => !!r.body && r.body.length > 0,
    });

    sleep(1);
}