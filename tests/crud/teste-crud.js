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
        { duration: '10s', target: 50 },
        { duration: '10s', target: 100 },
        { duration: '10s', target: 200 },
        { duration: '10s', target: 500 },
        { duration: '10s', target: 1000 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<3000'],
        checks: ['rate>0.95'],
    },
};

export default function () {
    if (departamentos.length === 0) {
        throw new Error('dados.json sem massa de dados em "departamentos"');
    }

    const indice = (__VU + __ITER) % departamentos.length;
    const departamentoBase = departamentos[indice];

    // =========================
    // 1. POST - Criar
    // =========================
    const payloadPost = JSON.stringify({
        nome: `${departamentoBase.nome} ${__VU}-${__ITER}`,
        numero: Number(departamentoBase.numero) + __VU + __ITER,
    });

    const paramsPost = {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            metodo: 'POST',
            endpoint: endpoint,
            nome_teste: 'departamento_crud_post',
        },
    };

    const postRes = http.post(`${baseUrl}${endpoint}`, payloadPost, paramsPost);

    let criado = null;
    try {
        criado = postRes.json();
    } catch (e) {
        criado = null;
    }

    check(postRes, {
        'POST status 201': (r) => r.status === 201,
        'POST retornou id': () => criado !== null && criado.id !== undefined && criado.id !== null,
    });

    if (!criado || !criado.id) {
        throw new Error('Não foi possível obter o ID no POST.');
    }

    const id = criado.id;

    sleep(1);

    // =========================
    // 2. GET - Buscar paginado
    // =========================
    const paramsGet = {
        tags: {
            metodo: 'GET',
            endpoint: endpoint,
            nome_teste: 'departamento_crud_get',
        },
    };

    const getRes = http.get(`${baseUrl}${endpoint}?page=0&size=10`, paramsGet);

    let pagina = null;
    try {
        pagina = getRes.json();
    } catch (e) {
        pagina = null;
    }

    check(getRes, {
        'GET status 200': (r) => r.status === 200,
        'GET retornou content': () => pagina !== null && Array.isArray(pagina.content),
    });

    sleep(1);

    // =========================
    // 3. PUT - Atualizar
    // =========================
    const payloadPut = JSON.stringify({
        nome: `Atualizado ${__VU}-${__ITER}`,
        numero: 5000 + __VU + __ITER,
    });

    const paramsPut = {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            metodo: 'PUT',
            endpoint: endpoint,
            nome_teste: 'departamento_crud_put',
        },
    };

    const putRes = http.put(`${baseUrl}${endpoint}/${id}`, payloadPut, paramsPut);

    let atualizado = null;
    try {
        atualizado = putRes.json();
    } catch (e) {
        atualizado = null;
    }

    check(putRes, {
        'PUT status 200': (r) => r.status === 200,
        'PUT corpo não vazio': (r) => !!r.body && r.body.length > 0,
    });

    sleep(1);

    // =========================
    // 4. DELETE - Remover
    // =========================
    const paramsDelete = {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            metodo: 'DELETE',
            endpoint: endpoint,
            nome_teste: 'departamento_crud_delete',
        },
    };

    const deleteRes = http.del(`${baseUrl}${endpoint}/${id}`, null, paramsDelete);

    check(deleteRes, {
        'DELETE status 204': (r) => r.status === 204,
    });

    sleep(1);
}