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
        { duration: '10s', target: 1 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<3000'],
    },
};

export default function () {
    const listRes = http.get(`${baseUrl}${endpoint}?page=0&size=20`);

    let pagina = null;
    try {
        pagina = listRes.json();
    } catch (e) {
        pagina = null;
    }

    const lista = pagina?.content || [];

    check(listRes, {
        'PUT busca prévia status 200': (r) => r.status === 200,
    });

    if (!Array.isArray(lista) || lista.length === 0) {
        throw new Error('Nenhum departamento encontrado para atualizar.');
    }

    const indice = (__VU + __ITER) % lista.length;
    const registro = lista[indice];
    const id = registro.id;

    const payload = JSON.stringify({
        nome: `Atualizado ${__VU}-${__ITER}`,
        numero: 1000 + __VU + __ITER,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            metodo: 'PUT',
            endpoint: endpoint,
            nome_teste: 'departamento_put',
        },
    };

    const res = http.put(`${baseUrl}${endpoint}/${id}`, payload, params);

    check(res, {
        'PUT status 200': (r) => r.status === 200,
        'PUT corpo não vazio': (r) => !!r.body && r.body.length > 0,
    });

    sleep(1);
}