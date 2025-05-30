// dataLoader.js - Carregador de Dados para Dashboard de Focos de Calor
class DataLoader {
    constructor() {
        this.baseUrl = './src/data/processed/';
        this.cache = new Map();
        this.retryCount = 3;
        this.retryDelay = 1000; // 1 segundo
    }

    // ═══════════════════════════════════════════════════════════════
    // 📊 CARREGAMENTO PRINCIPAL DE DADOS
    // ═══════════════════════════════════════════════════════════════
    async carregarDadosPrincipais() {
        try {
            console.log('🔄 Iniciando carregamento de dados...');
            
            // Tentar carregar dados processados
            let dados = await this.carregarArquivo('focos-completos.json');
            
            if (!dados || dados.length === 0) {
                console.warn('⚠️ Dados processados não encontrados, tentando dashboard...');
                dados = await this.carregarArquivo('focos-dashboard.json');
            }
            
            if (!dados || dados.length === 0) {
                console.warn('⚠️ Nenhum arquivo encontrado, gerando dados de exemplo...');
                dados = this.gerarDadosExemplo();
            }
            
            console.log(`✅ Dados carregados: ${dados.length} focos`);
            return dados;
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados principais:', error);
            return this.gerarDadosExemplo();
        }
    }

    async carregarEstatisticas() {
        try {
            const stats = await this.carregarArquivo('estatisticas.json');
            if (stats) {
                console.log('📈 Estatísticas carregadas');
                return stats;
            }
        } catch (error) {
            console.warn('⚠️ Estatísticas não encontradas:', error.message);
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔧 MÉTODOS AUXILIARES
    // ═══════════════════════════════════════════════════════════════
    async carregarArquivo(nomeArquivo, tentativa = 1) {
        const url = this.baseUrl + nomeArquivo;
        
        // Verificar cache
        if (this.cache.has(url)) {
            console.log(`💾 Dados do cache: ${nomeArquivo}`);
            return this.cache.get(url);
        }
        
        try {
            console.log(`📁 Tentando carregar: ${url} (tentativa ${tentativa})`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const dados = await response.json();
            
            // Salvar no cache
            this.cache.set(url, dados);
            
            return dados;
            
        } catch (error) {
            console.warn(`⚠️ Erro ao carregar ${nomeArquivo}:`, error.message);
            
            // Tentar novamente se não excedeu o limite
            if (tentativa < this.retryCount) {
                console.log(`🔄 Tentando novamente em ${this.retryDelay}ms...`);
                await this.delay(this.retryDelay);
                return this.carregarArquivo(nomeArquivo, tentativa + 1);
            }
            
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎲 GERAÇÃO DE DADOS DE EXEMPLO
    // ═══════════════════════════════════════════════════════════════
    gerarDadosExemplo() {
        console.log('🎲 Gerando dados de exemplo...');
        
        const municipios = [
            'Balsas', 'Timon', 'Caxias', 'Imperatriz', 'São Luís',
            'Bacabal', 'Codó', 'Chapadinha', 'Pinheiro', 'Viana',
            'Açailândia', 'Santa Inês', 'Pedreiras', 'Presidente Dutra',
            'Zé Doca', 'Coroatá', 'Itapecuru Mirim', 'Rosário'
        ];
        
        const biomas = [
            { nome: 'Cerrado', peso: 0.75 },
            { nome: 'Amazônia', peso: 0.15 },
            { nome: 'Caatinga', peso: 0.10 }
        ];
        
        const satelites = [
            'NOAA-21', 'NPP-375D', 'GOES-19', 'TERRA_M-T', 'METOP-C', 'AQUA_M-T'
        ];
        
        const dados = [];
        const totalFocos = 788; // Conforme dados do resumo
        
        // Coordenadas aproximadas do Maranhão
        const boundsMA = {
            north: -1.0,
            south: -10.0,
            east: -41.0,
            west: -48.0
        };
        
        for (let i = 0; i < totalFocos; i++) {
            // Distribuição realista por município
            let municipio;
            if (i < 375) municipio = 'Balsas';
            else if (i < 560) municipio = 'Timon';
            else if (i < 732) municipio = 'Caxias';
            else municipio = municipios[Math.floor(Math.random() * municipios.length)];
            
            // Bioma baseado em pesos
            const biomaRand = Math.random();
            let bioma = 'Cerrado';
            if (biomaRand < 0.10) bioma = 'Caatinga';
            else if (biomaRand < 0.25) bioma = 'Amazônia';
            
            // Data aleatória nos últimos 30 dias
            const agora = new Date();
            const diasAtras = Math.floor(Math.random() * 30);
            const horasAtras = Math.floor(Math.random() * 24);
            const minutosAtras = Math.floor(Math.random() * 60);
            
            const dataFoco = new Date(agora);
            dataFoco.setDate(agora.getDate() - diasAtras);
            dataFoco.setHours(agora.getHours() - horasAtras);
            dataFoco.setMinutes(agora.getMinutes() - minutosAtras);
            
            dados.push({
                id: i + 1,
                latitude: this.gerarCoordenada(boundsMA.south, boundsMA.north),
                longitude: this.gerarCoordenada(boundsMA.west, boundsMA.east),
                municipio: municipio,
                bioma: bioma,
                satelite: satelites[Math.floor(Math.random() * satelites.length)],
                data_hora: dataFoco.toISOString(),
                data: dataFoco.toISOString().split('T')[0],
                confianca: Math.floor(Math.random() * 100),
                temperatura: 300 + Math.random() * 150, // Kelvin
                potencia: Math.random() * 100
            });
        }
        
        console.log(`✅ ${dados.length} focos de exemplo gerados`);
        return dados;
    }

    gerarCoordenada(min, max) {
        return min + (Math.random() * (max - min));
    }

    // ═══════════════════════════════════════════════════════════════
    // 🛠️ UTILITÁRIOS
    // ═══════════════════════════════════════════════════════════════
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    limparCache() {
        this.cache.clear();
        console.log('🗑️ Cache limpo');
    }

    obterStatusCache() {
        return {
            tamanho: this.cache.size,
            arquivos: Array.from(this.cache.keys())
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // 📊 VALIDAÇÃO DE DADOS
    // ═══════════════════════════════════════════════════════════════
    validarDados(dados) {
        if (!Array.isArray(dados)) {
            throw new Error('Dados devem ser um array');
        }
        
        const camposObrigatorios = ['latitude', 'longitude'];
        const dadosValidos = dados.filter(foco => {
            return camposObrigatorios.every(campo => 
                foco.hasOwnProperty(campo) && 
                !isNaN(parseFloat(foco[campo]))
            );
        });
        
        if (dadosValidos.length !== dados.length) {
            console.warn(`⚠️ ${dados.length - dadosValidos.length} focos com coordenadas inválidas removidos`);
        }
        
        return dadosValidos;
    }

    // ═══════════════════════════════════════════════════════════════
    // 📈 PROCESSAMENTO DE DADOS
    // ═══════════════════════════════════════════════════════════════
    calcularEstatisticas(dados) {
        if (!dados || dados.length === 0) {
            return {
                total: 0,
                municipios: {},
                biomas: {},
                satelites: {},
                periodos: {}
            };
        }
        
        const stats = {
            total: dados.length,
            municipios: {},
            biomas: {},
            satelites: {},
            periodos: {}
        };
        
        dados.forEach(foco => {
            // Contar por município
            const municipio = foco.municipio || 'Não identificado';
            stats.municipios[municipio] = (stats.municipios[municipio] || 0) + 1;
            
            // Contar por bioma
            const bioma = foco.bioma || 'Não identificado';
            stats.biomas[bioma] = (stats.biomas[bioma] || 0) + 1;
            
            // Contar por satélite
            const satelite = foco.satelite || 'Não identificado';
            stats.satelites[satelite] = (stats.satelites[satelite] || 0) + 1;
            
            // Contar por período (mês/ano)
            const data = new Date(foco.data_hora || foco.data);
            if (!isNaN(data.getTime())) {
                const periodo = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
                stats.periodos[periodo] = (stats.periodos[periodo] || 0) + 1;
            }
        });
        
        return stats;
    }

    obterResumo(dados) {
        const stats = this.calcularEstatisticas(dados);
        
        // Município líder
        const municipioLider = Object.entries(stats.municipios)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
        
        // Bioma predominante
        const biomaPredominante = Object.entries(stats.biomas)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
        
        // Satélite principal
        const satelitePrincipal = Object.entries(stats.satelites)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
        
        return {
            total: stats.total,
            municipioLider,
            biomaPredominante,
            satelitePrincipal,
            ultimaAtualizacao: new Date().toLocaleString('pt-BR')
        };
    }
}

// Exportar para uso global
window.DataLoader = DataLoader;
