import http from 'k6/http';
import { check, sleep } from 'k6';

function getDados() {
    const paths = ['../../data/dados.json'];
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
};

export default function () {

    // 🔹 1. Buscar registros existentes
    const listRes = http.get(`${baseUrl}${endpoint}`);

    console.log(`GET status: ${listRes.status}`);

    let lista = [];
    try {
        lista = listRes.json();
    } catch (e) {
        lista = [];
    }

    if (!Array.isArray(lista) || lista.length === 0) {
        throw new Error('Nenhum registro para atualizar.');
    }

    // 🔹 2. Escolher um registro real
    const indice = (__VU + __ITER) % lista.length;
    const registro = lista[indice];
    const id = registro.id;

    // 🔹 3. Montar payload atualizado
    const payload = JSON.stringify({
        nome: `Atualizado ${__VU}-${__ITER}`,
        numero: 1000 + __VU + __ITER
    });

    const params = {
        headers: {
            'Content-Type': 'application/json'
        },
        tags: {
            metodo: 'PUT',
            endpoint: endpoint,
            nome_teste: 'departamento_update'
        }
    };

    // 🔹 4. Executar PUT
    const res = http.put(`${baseUrl}${endpoint}/${id}`, payload, params);

    console.log(`PUT id: ${id}`);
    console.log(`PUT status: ${res.status}`);
    console.log(`PUT body: ${res.body}`);

    check(res, {
        'Status 200 ou 204': (r) => [200, 204].includes(r.status),
    });

    sleep(1);
}