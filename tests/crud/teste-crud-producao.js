import http from 'k6/http';
import { check, sleep, group } from 'k6';

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
const BASE_URL = __ENV.BASE_URL || dados.baseUrl || 'http://localhost:8089';
const ENDPOINT = dados.endpoints?.departamento || '/api/departamento';
const DEPARTAMENTOS = dados.departamentos || [];

export const options = {
    scenarios: {
        crud_departamento: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '20s', target: 5 },
                { duration: '30s', target: 10 },
                { duration: '20s', target: 20 },
                { duration: '20s', target: 0 },
            ],
            gracefulRampDown: '10s',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<3000'],
        checks: ['rate>0.95'],

        'http_req_duration{metodo:POST}': ['p(95)<2500'],
        'http_req_duration{metodo:GET}': ['p(95)<2000'],
        'http_req_duration{metodo:PUT}': ['p(95)<2500'],
        'http_req_duration{metodo:DELETE}': ['p(95)<2000'],
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export function setup() {
    if (!Array.isArray(DEPARTAMENTOS) || DEPARTAMENTOS.length === 0) {
        throw new Error('dados.json sem massa de dados em "departamentos"');
    }

    const healthCheck = http.get(`${BASE_URL}${ENDPOINT}?page=0&size=1`, {
        tags: {
            metodo: 'GET',
            endpoint: ENDPOINT,
            nome_teste: 'departamento_setup',
        },
    });

    check(healthCheck, {
        'Setup - API respondeu 200': (r) => r.status === 200,
    });

    return {
        baseUrl: BASE_URL,
        endpoint: ENDPOINT,
        departamentos: DEPARTAMENTOS,
    };
}

export default function (data) {
    const indice = (__VU + __ITER) % data.departamentos.length;
    const departamentoBase = data.departamentos[indice];

    let idCriado = null;

    group('01 - Criar departamento', function () {
        const payload = JSON.stringify({
            nome: `${departamentoBase.nome} VU${__VU} ITER${__ITER}`,
            numero: Number(departamentoBase.numero) + __VU + __ITER,
        });

        const params = {
            headers: {
                'Content-Type': 'application/json',
            },
            tags: {
                metodo: 'POST',
                endpoint: data.endpoint,
                nome_teste: 'departamento_crud_post',
            },
        };

        const res = http.post(`${data.baseUrl}${data.endpoint}`, payload, params);

        let body = null;
        try {
            body = res.json();
        } catch (e) {
            body = null;
        }

        check(res, {
            'POST - status 201': (r) => r.status === 201,
            'POST - retornou id': () => body !== null && body.id !== undefined && body.id !== null,
            'POST - retornou nome': () => body !== null && !!body.nome,
        });

        if (!body || !body.id) {
            throw new Error('POST não retornou id válido.');
        }

        idCriado = body.id;
    });

    sleep(1);

    group('02 - Listar departamentos paginados', function () {
        const params = {
            tags: {
                metodo: 'GET',
                endpoint: data.endpoint,
                nome_teste: 'departamento_crud_get_lista',
            },
        };

        const res = http.get(`${data.baseUrl}${data.endpoint}?page=0&size=10`, params);

        let body = null;
        try {
            body = res.json();
        } catch (e) {
            body = null;
        }

        check(res, {
            'GET lista - status 200': (r) => r.status === 200,
            'GET lista - retornou content': () => body !== null && Array.isArray(body.content),
        });
    });

    sleep(1);

    group('03 - Buscar departamento criado por id', function () {
        const params = {
            tags: {
                metodo: 'GET',
                endpoint: `${data.endpoint}/{id}`,
                nome_teste: 'departamento_crud_get_por_id',
            },
        };

        const res = http.get(`${data.baseUrl}${data.endpoint}/${idCriado}`, params);

        let body = null;
        try {
            body = res.json();
        } catch (e) {
            body = null;
        }

        check(res, {
            'GET por id - status 200': (r) => r.status === 200,
            'GET por id - id confere': () => body !== null && body.id === idCriado,
        });
    });

    sleep(1);

    group('04 - Atualizar departamento criado', function () {
        const payload = JSON.stringify({
            nome: `Atualizado VU${__VU} ITER${__ITER}`,
            numero: 5000 + __VU + __ITER,
        });

        const params = {
            headers: {
                'Content-Type': 'application/json',
            },
            tags: {
                metodo: 'PUT',
                endpoint: `${data.endpoint}/{id}`,
                nome_teste: 'departamento_crud_put',
            },
        };

        const res = http.put(`${data.baseUrl}${data.endpoint}/${idCriado}`, payload, params);

        let body = null;
        try {
            body = res.json();
        } catch (e) {
            body = null;
        }

        check(res, {
            'PUT - status 200': (r) => r.status === 200,
            'PUT - corpo não vazio': (r) => !!r.body && r.body.length > 0,
            'PUT - nome atualizado': () => body !== null && !!body.nome,
        });
    });

    sleep(1);

    group('05 - Excluir departamento criado', function () {
        const params = {
            headers: {
                'Content-Type': 'application/json',
            },
            tags: {
                metodo: 'DELETE',
                endpoint: `${data.endpoint}/{id}`,
                nome_teste: 'departamento_crud_delete',
            },
        };

        const res = http.del(`${data.baseUrl}${data.endpoint}/${idCriado}`, null, params);

        check(res, {
            'DELETE - status 204': (r) => r.status === 204,
        });
    });

    sleep(1);
}