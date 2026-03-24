import http from 'k6/http';
import {check, sleep} from 'k6';

export const options = {
    stages: [
        {duration: '10s', target: 100},
        {duration: '10s', target: 200},
        {duration: '10s', target: 300},
        {duration: '10s', target: 400},
        {duration: '10s', target: 500},
        {duration: '10s', target: 600},
        {duration: '10s', target: 0},
    ],
};

export default function () {
    const endpoint = '/api/departamento';

    const res = http.get(`http://localhost:8089${endpoint}`, {
        tags: {
            metodo: 'GET',
            endpoint: endpoint,
            nome_teste: 'departamento_get'
        }
    });

    check(res, {
        'Status 200': (r) => r.status === 200,
        'Corpo não vazio': (r) => !!r.body && r.body.length > 0
    });

    sleep(1);
}