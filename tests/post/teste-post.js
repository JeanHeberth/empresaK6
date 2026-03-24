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
const departamentos = dados.departamentos || [];

export const options = {
    stages: [
        { duration: '10s', target: 1 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<3000'],
    },
};

export default function () {
    if (departamentos.length === 0) {
        throw new Error('dados.json sem massa de dados em "departamentos"');
    }

    const indice = (__VU + __ITER) % departamentos.length;
    const departamentoBase = departamentos[indice];

    const payload = JSON.stringify({
        nome: `${departamentoBase.nome} ${__VU}-${__ITER}`,
        numero: Number(departamentoBase.numero) + __VU + __ITER,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            metodo: 'POST',
            endpoint: endpoint,
            nome_teste: 'departamento_post',
        },
    };

    const res = http.post(`${baseUrl}${endpoint}`, payload, params);

    check(res, {
        'POST status 201': (r) => r.status === 201,
        'POST corpo não vazio': (r) => !!r.body && r.body.length > 0,
    });

    sleep(1);
}