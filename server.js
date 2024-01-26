const { auth, status_chamados, mensagens_dia, departamentos, usuarios, chamados_hoje, auth_eden, chamados_eden_hoje, atualizar_tempo } = require('./funcoes');

const fetch = require('node-fetch');
const { Headers } = fetch;
const mysql = require('mysql2/promise');

// Configurações do banco de dados
const dbConfig = {
    host: '192.168.70.44',
    user: 'Admin',
    password: 'S@nta799',
    database: 'multiapi',
    port: 3306
};

async function connectToDatabase() {
    return await mysql.createConnection(dbConfig);
}

async function id_atendentes() {
    const connection = await connectToDatabase();

    const selectQuery = `
        SELECT id_atendente
        FROM chamados
        WHERE id_atendente NOT IN (
            SELECT DISTINCT ud.id_atendente
            FROM UsuarioDepartamento ud
            WHERE ud.idDepartamento IN (799958, 799950)
        ) OR id_atendente IS NULL;
    `;
    const result = await connection.query(selectQuery);

    const idAtendentesArray = result.flat().map(row => row.id_atendente);

    const idAtendentesFiltrado = idAtendentesArray.filter(id => id !== undefined);

    await connection.end();

    return idAtendentesFiltrado;
}

async function insertOrUpdateChamados(idAtendente, nomeUsuario, naoLidos, ativos, pendentes, potenciais) {
    const connection = await connectToDatabase();

    try {
        const [rows] = await connection.query('SELECT * FROM chamados WHERE id_atendente = ?', [idAtendente]);

        if (rows.length === 0) {
            await connection.query('INSERT INTO chamados (id_atendente, nome_usuario, nao_lidos, ativos, pendentes, potenciais) VALUES (?, ?, ?, ?, ?, ?)', [idAtendente, nomeUsuario, naoLidos, ativos, pendentes, potenciais]);
        } else {
            await connection.query('UPDATE chamados SET nome_usuario = ?, nao_lidos = ?, ativos = ?, pendentes = ?, potenciais = ? WHERE id_atendente = ?', [nomeUsuario, naoLidos, ativos, pendentes, potenciais, idAtendente]);
        }
    } finally {
        await connection.end();
    }
}

async function insertOrUpdateData(parsedMensagensDia) {
    const connection = await connectToDatabase();

    const today = new Date().toISOString().split('T')[0];
    const formattedData = today.replace(/-/g, '');

    for (const item of parsedMensagensDia.horarioPicoTrocaMensagens) {
        const { hora, mensagens } = item;
        const columnName = `hora_${hora}`;

        const [existingData] = await connection.query(
            `SELECT * FROM mensagens_dia WHERE data = ?`, [formattedData]
        );

        if (existingData.length > 0) {
            await connection.query(
                `UPDATE mensagens_dia SET ${columnName} = ? WHERE data = ?`, [mensagens, formattedData]
            );
        } else {
            const insertQuery = `
          INSERT INTO mensagens_dia (data, ${columnName})
          VALUES (?, ?)
        `;
            await connection.query(insertQuery, [formattedData, mensagens]);
        }
    }

    await connection.end();
}

async function insertOrUpdateDepartamentos(parsedDepartamentos) {
    const connection = await connectToDatabase();

    for (const item of parsedDepartamentos) {
        const { id, nome } = item;

        const [existingData] = await connection.query(
            `SELECT * FROM departamentos WHERE idDepartamento = ?`, [id]
        );

        if (existingData.length == 0) {
            const insertQuery = `
            INSERT INTO departamentos (idDepartamento, nomeDepartamento) VALUES (?, ?)
            `;
                await connection.query(insertQuery, [id, nome]);
        }
    }

    await connection.end();
}

async function insertOrUpdateUsuarios(usuariosIds) {
    const connection = await connectToDatabase();

    for (const item of usuariosIds) {
        const { id, online, departamentos } = item;

        const [existingData] = await connection.query(
            'SELECT * FROM chamados WHERE id_atendente = ?', [id]
        );

        const status = online ? 1 : 0;

        if (existingData.length > 0) {
            const updateQuery = 'UPDATE chamados SET status = ? WHERE id_atendente = ?';
            await connection.query(updateQuery, [status, id]);

            await connection.query('DELETE FROM UsuarioDepartamento WHERE id_atendente = ?', [id]);

            if (departamentos && departamentos.length > 0) {
                const insertAssocQuery = 'INSERT INTO UsuarioDepartamento (id_atendente, idDepartamento) VALUES (?, ?)';
                for (const departamento of departamentos) {
                    await connection.query(insertAssocQuery, [id, departamento.id]);
                }
            }
        } else {
        }
    }

    await connection.end();
}

async function insertOrUpdateChamadosHoje(multi360Chamados) {
    const connection = await connectToDatabase();

    const updateQuery = 'UPDATE infos SET valor = ? WHERE id_info = 1';
    await connection.query(updateQuery, [multi360Chamados]);
    
    await connection.end();
}

async function insertOrUpdateChamadosHojeEden(edenChamados) {
    const connection = await connectToDatabase();

    const updateQuery = 'UPDATE infos SET valor = ? WHERE id_info = 2';
    await connection.query(updateQuery, [edenChamados]);
    
    await connection.end();
}

async function insertOrUpdateTempoMedioChamados(tempoChamados) {
    const connection = await connectToDatabase();

    try {
        for (const resultado of tempoChamados) {
            const updateQuery = 'UPDATE chamados SET tempo_atendimento_mes = ? WHERE id_atendente = ?';
            await connection.query(updateQuery, [resultado.mediaTempo, resultado.atendenteId]);
        }
    } catch (error) {
        console.error('Erro durante a atualização:', error);
        throw error;
    } finally {
        await connection.end();
    }
}



async function updateDatabase() {
    try {
        const token = await auth();
        const token_web = await auth_eden();

        const idAtendentes = await id_atendentes();

        const statusChamados = await status_chamados(token);
        const mensagensDia = await mensagens_dia(token);
        const departamentosIds = await departamentos(token);
        const usuariosIds = await usuarios(token);
        const multi360Chamados = await chamados_hoje(token);
        const edenChamados = await chamados_eden_hoje(token_web);
        const tempoChamados = await atualizar_tempo(token, idAtendentes);


        const parsedStatusChamados = JSON.parse(statusChamados);
        const parsedMensagensDia = JSON.parse(mensagensDia);
        const parsedDepartamentos = JSON.parse(departamentosIds);
        const parsedUsuarios = JSON.parse(usuariosIds);

        insertOrUpdateData(parsedMensagensDia);
        insertOrUpdateDepartamentos(parsedDepartamentos);
        insertOrUpdateUsuarios(parsedUsuarios);
        insertOrUpdateChamadosHoje(multi360Chamados.quantidadeChamados);
        insertOrUpdateChamadosHojeEden(edenChamados.quantidadeChamados);
        insertOrUpdateTempoMedioChamados(tempoChamados);

        if (parsedStatusChamados && parsedStatusChamados.agents) {
            for (const agent of parsedStatusChamados.agents) {
                const { id, name, types } = agent;
                const naoLidos = types.find(t => t.type === 'TICKET_ACTIVE_NEW_MESSAGE')?.value || 0;
                const ativos = types.find(t => t.type === 'TICKET_ACTIVE')?.value || 0;
                const pendentes = types.find(t => t.type === 'TICKET_PENDING')?.value || 0;
                const potenciais = types.find(t => t.type === 'FOLLOW_UP')?.value || 0;

                await insertOrUpdateChamados(id, name, naoLidos, ativos, pendentes, potenciais);
            }

            console.log('Dados inseridos/atualizados com sucesso.');
        } else {
            console.error('Erro ao obter informações de status_chamados.');
        }
    } catch (error) {
        console.error('Erro ao autenticar ou atualizar o banco de dados:', error);
    }
}

//updateDatabase();

setInterval(updateDatabase, 3000);