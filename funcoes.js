const fetch = require('node-fetch');
const moment = require('moment');
const { Headers } = fetch;

module.exports = {
    auth,
    status_chamados,
    mensagens_dia,
    departamentos,
    usuarios,
    chamados_hoje,
    chamados_eden_hoje,
    auth_eden,
    atualizar_tempo
};

async function auth() {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');

    const corpoRequisicao = {
        login: "",
        senha: ""
    };

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(corpoRequisicao),
        redirect: 'follow'
    };

    try {
        const response = await fetch("https://painel.multi360.com.br/api/usuarios/auth_web", requestOptions);
        const result = await response.json();
        return result.token;
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

async function auth_eden() {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');

    const corpoRequisicao = {
        login: "luiz.marroni@infowayti.com.br",
        senha: "S@nta799"
    };

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(corpoRequisicao),
        redirect: 'follow'
    };

    try {
        const response = await fetch("http://eden.infowayti.com.br:10352/api/seguranca/login", requestOptions);
        const result = await response.json();
        const token = "Bearer "+result.accessToken;
        return token;
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

async function status_chamados(authToken) {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", authToken);

    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
    };

    try {
        const response = await fetch("https://painel.multi360.com.br/api/atendimentos/chat/metrics?botId=0", requestOptions);
        const result = await response.text();
        return result;
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

async function mensagens_dia(authToken) {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", authToken);
    const obterDataAtual = () => new Date().toLocaleDateString('pt-BR');

    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
    };

    try {
        const response = await fetch("https://painel.multi360.com.br/api/dashboard/troca-mensagens?data=" + obterDataAtual(), requestOptions);
        const result = await response.text();
        return result;
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

async function departamentos(authToken) {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", authToken);

    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
    };

    try {
        const response = await fetch("https://painel.multi360.com.br/api/departamentos", requestOptions);
        const result = await response.text();
        return result;
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

async function usuarios(authToken) {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", authToken);

    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
    };

    try {
        const response = await fetch("https://painel.multi360.com.br/api/atendentes", requestOptions);
        const result = await response.text();
        return result;
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

async function chamados_hoje(authToken) {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", authToken);

    // Obter a data atual no formato DD/MM/YYYY
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
    var yyyy = today.getFullYear();

    var formattedDate = dd + '%2F' + mm + '%2F' + yyyy;

    // Variáveis para controle da paginação
    var offset = 0;
    var limit = 50;
    var allResults = [];

    do {
        // Montar a URL com a data atual e parâmetros de paginação
        var url = "https://painel.multi360.com.br/api/relatorios/atendimentos?atendente=-1&camposSegmentacao=%255B%255D&canal=TODOS&dataCriacaoDe=" + formattedDate + "&dataFinalizacaoAte=" + formattedDate + "&departamento=-1&motivoId=-1&offset=" + offset + "&origem=TODOS&status=Todos";

        var requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };

        try {
            const response = await fetch(url, requestOptions);
            const result = await response.json(); // Parse do resultado para JSON

            // Adicionar os resultados atuais ao array
            allResults.push(...result);

            // Atualizar o offset para a próxima página
            offset += limit;

        } catch (error) {
            console.error('Erro:', error);
            throw error;
        }

    } while (offset < 500); // Defina um limite para o número máximo de chamados (10 páginas de 50)

    // Retornar todos os resultados e a quantidade total de chamados
    return { resultados: allResults, quantidadeChamados: allResults.length };
}

async function chamados_eden_hoje(authToken) {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", authToken);
    myHeaders.append('Content-Type', 'application/json');

    // Obter a data atual no formato YYYY-MM-DD
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
    var dd = String(today.getDate()).padStart(2, '0');

    var formattedDate = `${yyyy}-${mm}-${dd}`;

    // Atualizar os valores de DataDe e DataPara
    const corpoRequisicao = {
        "filtroPricipal": {
            "filtroBy": [
                {
                    "colunas": ["origem", "status", "tipoAtendimento", "apelidoCliente", "razaoSocialCliente", "cnpjCliente", "observacao", "protocolo"],
                    "valor": ""
                },
                {
                    "label": "Busca por Status ou Origem",
                    "opcaoAgrupada": false,
                    "colunas": ["status"],
                    "valor": null
                },
                {
                    "colunas": ["DataDe"],
                    "valor": formattedDate
                },
                {
                    "colunas": ["DataPara"],
                    "valor": formattedDate
                }
            ],
            "ordemBy": [
                {
                    "coluna": "dataCadastro",
                    "tipo": "desc"
                }
            ]
        },
        "filtrosAdicionais": {
            "tecnico": null,
            "tipoAtendimento": null
        }
    };


    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(corpoRequisicao),
        redirect: 'follow'
    };

    // Montar a URL com a data atual
    var url = "http://eden.infowayti.com.br:10352/api/chamados?page=1&pageSize=15";

    try {
        const response = await fetch(url, requestOptions);
        const result = await response.text();

        // Parse do resultado para obter a quantidade de chamados
        const data = JSON.parse(result);
        const quantidadeChamados = data.rowCount;

        // Retornar tanto o resultado quanto a quantidade de chamados
        return { resultado: result, quantidadeChamados };
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

async function atualizar_tempo(authToken, atendentesIds) {
    var myHeaders = new Headers();
    myHeaders.append("Authorization", authToken);

    // Definindo as datas conforme sua especificação
    const dataCriacaoDe = moment().startOf('month').format('DD/MM/YYYY');
    const dataFinalizacaoAte = moment().format('DD/MM/YYYY');

    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
    };

    try {
        const resultados = [];

        for (const atendenteId of atendentesIds) {
            let offset = 0;
            let chamados = [];

            do {
                const response = await fetch(`https://painel.multi360.com.br/api/relatorios/atendimentos?atendente=${atendenteId}&camposSegmentacao=%255B%255D&canal=TODOS&dataCriacaoDe=${dataCriacaoDe}&dataFinalizacaoAte=${dataFinalizacaoAte}&departamento=-1&motivoId=-1&offset=${offset}&origem=TODOS&status=Todos`, requestOptions);
                const result = await response.json();
                
                if (result.length === 0) {
                    break;
                }

                chamados = chamados.concat(result);
                offset += 50;
            } while (chamados.length < 50);

            const minutosTotais = chamados.reduce((total, chamado) => {
                const dataInicio = moment(chamado.data, 'DD/MM/YYYY HH:mm');
                const dataFinalizacao = moment(chamado.dataFinalizacao, 'DD/MM/YYYY HH:mm');
                const diferencaMinutos = dataFinalizacao.diff(dataInicio, 'minutes');
                return total + diferencaMinutos;
            }, 0);

            const mediaMinutos = minutosTotais / chamados.length;

            if (!isNaN(mediaMinutos)) {
                resultados.push({
                    atendenteId: atendenteId,
                    mediaTempo: mediaMinutos
                });
            }
        }

        return resultados;
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

(async () => {
    try {
        const token = await auth();

        const token_eden = await auth_eden();

        const resultadoStatusChamados = await status_chamados(token);

        const resultadoMensagensDia = await mensagens_dia(token);

        const resultadoDepartamentos = await departamentos(token);

        const resultadoUsuarios = await usuarios(token);

        const resultadoChamadosHoje = await chamados_hoje(token);

        const resultadoChamadosEdenHoje = await chamados_eden_hoje(token_eden);
    } catch (error) {
        console.error('Erro ao autenticar ou obter status de chamados:', error);
    }
})();
