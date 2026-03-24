import http from 'k6/http';
import { check, sleep } from 'k6';

function getDados() {
    const paths = ['../data/dados.json', '../../data/dados.json'];
    for (const path of paths) {
        try {
            return JSON.parse(open(path));
        } catch (e) {}
    }
    throw new Error('Arquivo data/dados.json não encontrado!');
}

const dados = getDados();
const baseUrl = __ENV.BASE_URL || dados.baseUrl || 'http://localhost:8089';
const endpoint = dados.endpoints?.departamento || '/api/departamento';

export const options = {
    stages: [
        { duration: '10s', target: 10 },
        { duration: '10s', target: 30 },
        { duration: '10s', target: 50 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<3000'],
    },
};

export default function () {
    const res = http.get(`${baseUrl}${endpoint}?page=0&size=10`, {
        tags: {
            metodo: 'GET',
            endpoint: endpoint,
            nome_teste: 'departamento_get',
        },
    });

    check(res, {
        'GET status 200': (r) => r.status === 200,
        'GET corpo não vazio': (r) => !!r.body && r.body.length > 0,
    });

    sleep(1);
}