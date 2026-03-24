import http from 'k6/http';
import { check, sleep } from 'k6';

// Função robusta para localizar o arquivo de dados
function getDados() {
    const paths = ['../data/dados.json'];
    for (const path of paths) {
        try {
            return JSON.parse(open(path));
        } catch (e) {}
    }
    throw new Error('Arquivo data/dados.json não encontrado em nenhum caminho padrão!');
}

const dados = getDados();
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
    // Seleciona um departamento para editar
    const indice = (__VU + __ITER) % departamentos.length;
    const departamentoBase = departamentos[indice];
    // Simula um ID (ajuste conforme sua API)
    const id = departamentoBase.id || indice + 1;
    const departamentoEditado = {
        nome: `${departamentoBase.nome} EDITADO ${__VU}-${__ITER}`,
        numero: `${departamentoBase.numero}-${Math.floor(Math.random() * 10000)}`
    };
    const payload = JSON.stringify(departamentoEditado);
    const params = {
        headers: {
            'Content-Type': 'application/json'
        },
        tags: {
            metodo: 'PUT',
            endpoint: endpoint,
            nome_teste: 'departamento_put'
        }
    };
    const res = http.put(`${baseUrl}${endpoint}/${id}`, payload, params);
    check(res, {
        'Status 200 ou 204': (r) => r.status === 200 || r.status === 204,
        'Body válido': (r) => r.body !== undefined,
    });
    sleep(1);
}

