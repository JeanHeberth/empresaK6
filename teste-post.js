import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 999,
    duration: '10s',
};

export default function () {
    const endpoint = '/api/departamento';

    const payload = JSON.stringify({
        nome: `Departamento Contabilidade ${Date.now()}`,
        numero: `${Math.floor(Math.random() * 100000)}`
    });
    const params = {
        headers: {
            'Content-Type': 'application/json'
        },
        tags: {
            metodo: 'POST',
            endpoint: endpoint,
            nome_teste: 'departamento_post'
        }
    };

    const res = http.post(`http://localhost:8089${endpoint}`, payload, params);

    check(res, {
        'Status 201': (r) => r.status === 201 || r.status === 200,
        'Resposta contém nome': (r) => r.body.includes('Departamento'),
    });

    sleep(1);
}
