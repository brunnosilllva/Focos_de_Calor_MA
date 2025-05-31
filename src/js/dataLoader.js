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
        console.log('🎲 Gerando dados de exemplo para Brasil completo...');
        
        // Municípios representativos de diferentes regiões do Brasil
        const municipiosRegioes = [
            // Norte
            { nome: 'Manaus', estado: 'AM', lat: -3.1, lng: -60.0, peso: 0.15 },
            { nome: 'Belém', estado: 'PA', lat: -1.4, lng: -48.5, peso: 0.12 },
            { nome: 'Porto Velho', estado: 'RO', lat: -8.8, lng: -63.9, peso: 0.08 },
            { nome: 'Rio Branco', estado: 'AC', lat: -9.9, lng: -67.8, peso: 0.06 },
            
            // Nordeste
            { nome: 'Balsas', estado: 'MA', lat: -7.5, lng: -46.0, peso: 0.10 },
            { nome: 'Timon', estado: 'MA', lat: -5.1, lng: -42.8, peso: 0.08 },
            { nome: 'Barreiras', estado: 'BA', lat: -12.2, lng: -45.0, peso: 0.07 },
            { nome: 'Petrolina', estado: 'PE', lat: -9.4, lng: -40.5, peso: 0.05 },
            
            // Centro-Oeste
            { nome: 'Sorriso', estado: 'MT', lat: -12.5, lng: -55.7, peso: 0.09 },
            { nome: 'Sinop', estado: 'MT', lat: -11.9, lng: -55.5, peso: 0.07 },
            { nome: 'Corumbá', estado: 'MS', lat: -19.0, lng: -57.7, peso: 0.05 },
            { nome: 'Brasília', estado: 'DF', lat: -15.8, lng: -47.9, peso: 0.03 },
            
            // Sudeste
            { nome: 'Ribeirão Preto', estado: 'SP', lat: -21.2, lng: -47.8, peso: 0.04 },
            { nome: 'Uberaba', estado: 'MG', lat: -19.7, lng: -47.9, peso: 0.03 },
            
            // Sul
            { nome: 'Ponta Grossa', estado: 'PR', lat: -25.1, lng: -50.2, peso: 0.02 }
        ];
        
        const biomas = [
            { nome: 'Cerrado', peso: 0.45 },
            { nome: 'Amazônia', peso: 0.35 },
            { nome: 'Caatinga', peso: 0.10 },
            { nome: 'Mata Atlântica', peso: 0.07 },
            { nome: 'Pantanal', peso: 0.02 },
            { nome: 'Pampas', peso: 0.01 }
        ];
        
        const satelites = [
            'NOAA-21', 'NPP-375D', 'GOES-19', 'TERRA_M-T', 'METOP-C', 'AQUA_M-T', 'NOAA-20'
        ];
        
        const dados = [];
        const totalFocos = 5000; // Reduzido para exemplo, mas representativo
        
        // Coordenadas do Brasil completo
        const boundsBrasil = {
            north: 5.3,
            south: -33.7,
            east: -28.8,
            west: -73.9
        };
        
        for (let i = 0; i < totalFocos; i++) {
            // Escolher região baseada no peso
            const pesoAleatorio = Math.random();
            let pesoAcumulado = 0;
            let municipioEscolhido = municipiosRegioes[0];
            
            for (const municipio of municipiosRegioes) {
                pesoAcumulado += municipio.peso;
                if (pesoAleatorio <= pesoAcumulado) {
                    municipioEscolhido = municipio;
                    break;
                }
            }
            
            // Dispersar coordenadas em torno do município (raio ~100km)
            const dispersao = 1.0; // ~100km em graus
            const lat = municipioEscolhido.lat + (Math.random() - 0.5) * dispersao;
            const lng = municipioEscolhido.lng + (Math.random() - 0.5) * dispersao;
            
            // Validar se está dentro do Brasil
            const latFinal = Math.max(boundsBrasil.south, Math.min(boundsBrasil.north, lat));
            const lngFinal = Math.max(boundsBrasil.west, Math.min(boundsBrasil.east, lng));
            
            // Escolher bioma baseado no peso e região
            let biomaEscolhido = 'Cerrado';
            const biomaRandom = Math.random();
            
            // Lógica regional para biomas
            if (municipioEscolhido.estado === 'AM' || municipioEscolhido.estado === 'RO' || municipioEscolhido.estado === 'AC') {
                biomaEscolhido = biomaRandom < 0.8 ? 'Amazônia' : 'Cerrado';
            } else if (municipioEscolhido.estado === 'BA' || municipioEscolhido.estado === 'PE') {
                biomaEscolhido = biomaRandom < 0.6 ? 'Caatinga' : 'Cerrado';
            } else if (municipioEscolhido.estado === 'MT' || municipioEscolhido.estado === 'MS') {
                if (biomaRandom < 0.1) biomaEscolhido = 'Pantanal';
                else biomaEscolhido = biomaRandom < 0.7 ? 'Cerrado' : 'Amazônia';
            } else if (municipioEscolhido.estado === 'SP' || municipioEscolhido.estado === 'MG') {
                biomaEscolhido = biomaRandom < 0.3 ? 'Mata Atlântica' : 'Cerrado';
            } else if (municipioEscolhido.estado === 'PR' || municipioEscolhido.estado === 'RS') {
                biomaEscolhido = biomaRandom < 0.3 ? 'Mata Atlântica' : biomaRandom < 0.1 ? 'Pampas' : 'Cerrado';
            }
            
            // Data aleatória nos últimos 90 dias
            const agora = new Date();
            const diasAtras = Math.floor(Math.random() * 90);
            const horasAtras = Math.floor(Math.random() * 24);
            const minutosAtras = Math.floor(Math.random() * 60);
            
            const dataFoco = new Date(agora);
            dataFoco.setDate(agora.getDate() - diasAtras);
            dataFoco.setHours(agora.getHours() - horasAtras);
            dataFoco.setMinutes(agora.getMinutes() - minutosAtras);
            
            dados.push({
                id: i + 1,
                latitude: latFinal,
                longitude: lngFinal,
                municipio: municipioEscolhido.nome,
                estado: municipioEscolhido.estado,
                bioma: biomaEscolhido,
                satelite: satelites[Math.floor(Math.random() * satelites.length)],
                data_hora: dataFoco.toISOString(),
                data: dataFoco.toISOString().split('T')[0],
                confianca: Math.floor(Math.random() * 100),
                temperatura: 300 + Math.random() * 150, // Kelvin
                potencia: Math.random() * 100
            });
        }
        
        console.log(`✅ ${dados.length} focos de exemplo gerados para o Brasil`);
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
