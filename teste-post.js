import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 895200000000,
    duration: '10s',
};

export default function () {
    const url = 'http://localhost:8089/api/departamento';

    const payload = JSON.stringify({
        nome: 'Jean Heberth',
        numero: 30,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json'
        },
        tags: {
            request_type: 'POST_USUARIO'
        }
    };

    const res = http.post(url, payload, params);

    check(res, {
        'Status 201': (r) => r.status === 201 || r.status === 200,
        'Resposta contém nome': (r) => r.body.includes('Jean'),
    });

    sleep(1);
}
