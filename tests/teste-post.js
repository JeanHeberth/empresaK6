import http from 'k6/http';
import { check, sleep } from 'k6';

const dados = JSON.parse(open('./data/dados.json'));
const baseUrl = __ENV.BASE_URL || dados.baseUrl || 'http://localhost:8089';
const endpoint = dados.endpoints?.departamento || '/api/departamento';
const departamentos = dados.departamentos || [];

export const options = {
    stages: [
        { duration: '10s', target: 100 },
        { duration: '10s', target: 300 },
        { duration: '10s', target: 600 },
        { duration: '10s', target: 999 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<1000'],
    },
};

export default function () {
    if (departamentos.length === 0) {
        throw new Error('dados.json sem massa de dados em "departamentos"');
    }

    const indice = (__VU + __ITER) % departamentos.length;
    const departamentoBase = departamentos[indice];
    const departamento = {
        nome: `${departamentoBase.nome} ${__VU}-${__ITER}`,
        numero: `${departamentoBase.numero}-${Math.floor(Math.random() * 10000)}`
    };

    const payload = JSON.stringify(departamento);
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

    const res = http.post(`${baseUrl}${endpoint}`, payload, params);

    check(res, {
        'Status 201': (r) => r.status === 201 || r.status === 200,
        'Resposta contém nome': (r) => !!r.body && r.body.includes(departamentoBase.nome),
    });

    sleep(1);
}
