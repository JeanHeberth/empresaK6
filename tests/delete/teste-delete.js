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
        'DELETE busca prévia status 200': (r) => r.status === 200,
    });

    if (!Array.isArray(lista) || lista.length === 0) {
        throw new Error('Nenhum departamento encontrado para deletar.');
    }

    const indice = (__VU + __ITER) % lista.length;
    const registro = lista[indice];
    const id = registro.id;

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            metodo: 'DELETE',
            endpoint: endpoint,
            nome_teste: 'departamento_delete',
        },
    };

    const res = http.del(`${baseUrl}${endpoint}/${id}`, null, params);

    check(res, {
        'DELETE status 204': (r) => r.status === 204,
    });

    sleep(1);
}