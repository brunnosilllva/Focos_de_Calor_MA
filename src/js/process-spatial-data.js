// process-spatial-data.js - Processamento Espacial Corrigido para Brasil Completo
const fs = require('fs').promises;
const path = require('path');
const turf = require('@turf/turf');

class ProcessadorEspacialBrasil {
    constructor() {
        this.diretorioRaw = './src/data/raw';
        this.diretorioProcessado = './src/data/processed';
        this.diretorioShapefiles = './src/data/shapefiles';
        
        // 🇧🇷 COORDENADAS CORRETAS DO BRASIL COMPLETO
        this.boundsBrasil = {
            north: 5.264877,      // Roraima
            south: -33.742156,    // Rio Grande do Sul
            east: -28.847894,     // Fernando de Noronha
            west: -73.982817      // Acre
        };
        
        // Referências espaciais que serão carregadas
        this.referenciasSpatiais = {
            municipios: null,
            estados: null,
            biomas: null,
            unidadesConservacao: null,
            terrasIndigenas: null,
            propriedadesRurais: null
        };
        
        this.estatisticas = {
            totalFocos: 0,
            focosComMunicipio: 0,
            focosSemMunicipio: 0,
            focosComBioma: 0,
            joinsRealizados: 0,
            tempoProcessamento: 0
        };
    }

    async executar() {
        console.log('🇧🇷 Iniciando processamento espacial para Brasil completo...');
        const inicio = Date.now();
        
        try {
            // 1. Criar diretórios necessários
            await this.criarDiretorios();
            
            // 2. Carregar referências espaciais
            await this.carregarReferenciasSpatiais();
            
            // 3. Processar todos os CSVs da pasta raw
            const arquivosCsv = await this.encontrarArquivosCsv();
            console.log(`📁 Encontrados ${arquivosCsv.length} arquivos CSV para processar`);
            
            // 4. Processar arquivos em lotes para otimizar memória
            const focosProcessados = [];
            const tamanhoLote = 50000; // Processar 50k focos por vez
            
            for (const arquivo of arquivosCsv) {
                console.log(`🔄 Processando: ${arquivo}`);
                const focos = await this.processarArquivoCsv(arquivo);
                
                // Processar em lotes
                for (let i = 0; i < focos.length; i += tamanhoLote) {
                    const lote = focos.slice(i, i + tamanhoLote);
                    const loteProcessado = await this.processarLoteFocos(lote);
                    focosProcessados.push(...loteProcessado);
                    
                    console.log(`   ✅ Lote ${Math.floor(i/tamanhoLote) + 1} processado: ${loteProcessado.length} focos`);
                }
            }
            
            console.log(`🎯 Total processado: ${focosProcessados.length} focos`);
            
            // 5. Calcular estatísticas finais
            this.calcularEstatisticas(focosProcessados);
            
            // 6. Salvar resultados
            await this.salvarResultados(focosProcessados);
            
            this.estatisticas.tempoProcessamento = Date.now() - inicio;
            console.log(`⏱️ Processamento concluído em ${this.estatisticas.tempoProcessamento}ms`);
            
            // 7. Salvar relatório de processamento
            await this.salvarRelatorioProcessamento();
            
        } catch (error) {
            console.error('❌ Erro no processamento espacial:', error);
            throw error;
        }
    }

    async criarDiretorios() {
        const diretorios = [this.diretorioProcessado, this.diretorioShapefiles];
        
        for (const dir of diretorios) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
            }
        }
    }

    async carregarReferenciasSpatiais() {
        console.log('🗺️ Carregando referências espaciais...');
        
        try {
            // Tentar carregar shapefiles se existirem
            const arquivosReferencia = [
                { nome: 'municipios', arquivo: 'municipios_brasil.geojson' },
                { nome: 'estados', arquivo: 'estados_brasil.geojson' },
                { nome: 'biomas', arquivo: 'biomas_brasil.geojson' },
                { nome: 'unidadesConservacao', arquivo: 'unidades_conservacao.geojson' },
                { nome: 'terrasIndigenas', arquivo: 'terras_indigenas.geojson' }
            ];
            
            for (const ref of arquivosReferencia) {
                try {
                    const caminho = path.join(this.diretorioShapefiles, ref.arquivo);
                    const dados = await fs.readFile(caminho, 'utf8');
                    this.referenciasSpatiais[ref.nome] = JSON.parse(dados);
                    console.log(`   ✅ ${ref.nome}: ${this.referenciasSpatiais[ref.nome].features?.length || 0} feições`);
                } catch (error) {
                    console.warn(`   ⚠️ ${ref.nome}: não encontrado (${ref.arquivo})`);
                    this.referenciasSpatiais[ref.nome] = null;
                }
            }
            
            // Se não encontrou shapefiles, usar fallback com dados aproximados
            if (!this.referenciasSpatiais.municipios) {
                console.log('📦 Usando dados de municípios simplificados...');
                this.referenciasSpatiais.municipios = await this.criarMunicipiosSimplificados();
            }
            
            if (!this.referenciasSpatiais.biomas) {
                console.log('📦 Usando dados de biomas simplificados...');
                this.referenciasSpatiais.biomas = await this.criarBiomasSimplificados();
            }
            
        } catch (error) {
            console.warn('⚠️ Erro ao carregar referências espaciais:', error.message);
            console.log('📦 Usando sistema de fallback...');
            await this.criarReferenciasFallback();
        }
    }

    async encontrarArquivosCsv() {
        try {
            const arquivos = await fs.readdir(this.diretorioRaw);
            return arquivos.filter(arquivo => 
                arquivo.toLowerCase().endsWith('.csv') && 
                !arquivo.startsWith('.')
            );
        } catch (error) {
            console.warn('⚠️ Diretório raw não encontrado, criando dados de exemplo...');
            return [];
        }
    }

    async processarArquivoCsv(nomeArquivo) {
        const caminhoArquivo = path.join(this.diretorioRaw, nomeArquivo);
        
        try {
            const conteudo = await fs.readFile(caminhoArquivo, 'utf8');
            const focos = this.parsearCsv(conteudo);
            
            console.log(`   📊 ${nomeArquivo}: ${focos.length} focos encontrados`);
            return focos;
            
        } catch (error) {
            console.error(`❌ Erro ao processar ${nomeArquivo}:`, error.message);
            return [];
        }
    }

    parsearCsv(conteudo) {
        const linhas = conteudo.split('\n');
        const cabecalho = linhas[0].split(',').map(col => col.trim().toLowerCase());
        
        // Mapear colunas possíveis (flexível para diferentes formatos)
        const mapeamentoColunas = {
            lat: ['lat', 'latitude', 'y'],
            lng: ['lon', 'lng', 'longitude', 'x'],
            data: ['data', 'date', 'data_hora', 'datetime'],
            satelite: ['satelite', 'satellite', 'sat'],
            confianca: ['confianca', 'confidence', 'conf'],
            temperatura: ['temperatura', 'temp', 'temperature'],
            potencia: ['potencia', 'power', 'frp']
        };
        
        const focos = [];
        
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            
            const valores = linha.split(',');
            
            try {
                const foco = this.extrairDadosFoco(cabecalho, valores, mapeamentoColunas);
                
                // Validar coordenadas (Brasil completo)
                if (this.validarCoordenadas(foco.latitude, foco.longitude)) {
                    focos.push(foco);
                }
                
            } catch (error) {
                // Pular linhas com erro silenciosamente
                continue;
            }
        }
        
        return focos;
    }

    extrairDadosFoco(cabecalho, valores, mapeamento) {
        const foco = { id: Math.random().toString(36).substr(2, 9) };
        
        // Extrair cada campo baseado no mapeamento
        for (const [campo, possiveisNomes] of Object.entries(mapeamento)) {
            const indice = possiveisNomes.find(nome => cabecalho.includes(nome));
            if (indice !== undefined) {
                const indiceCabecalho = cabecalho.indexOf(indice);
                if (indiceCabecalho >= 0 && valores[indiceCabecalho]) {
                    foco[campo] = valores[indiceCabecalho].trim();
                }
            }
        }
        
        // Converter tipos
        foco.latitude = parseFloat(foco.lat || foco.latitude);
        foco.longitude = parseFloat(foco.lng || foco.longitude);
        foco.confianca = parseInt(foco.confianca || 50);
        foco.temperatura = parseFloat(foco.temperatura || 300);
        foco.potencia = parseFloat(foco.potencia || 0);
        
        // Padronizar data
        if (foco.data) {
            foco.data_hora = this.padronizarData(foco.data);
            foco.data = foco.data_hora.split('T')[0];
        } else {
            foco.data_hora = new Date().toISOString();
            foco.data = foco.data_hora.split('T')[0];
        }
        
        return foco;
    }

    validarCoordenadas(lat, lng) {
        if (isNaN(lat) || isNaN(lng)) return false;
        
        // Verificar se está dentro dos bounds do Brasil
        return lat >= this.boundsBrasil.south && 
               lat <= this.boundsBrasil.north &&
               lng >= this.boundsBrasil.west && 
               lng <= this.boundsBrasil.east;
    }

    async processarLoteFocos(focos) {
        const focosProcessados = [];
        
        for (const foco of focos) {
            try {
                // Realizar joins espaciais
                const focoEnriquecido = await this.enriquecerFoco(foco);
                focosProcessados.push(focoEnriquecido);
                this.estatisticas.joinsRealizados++;
                
            } catch (error) {
                // Em caso de erro, manter foco original
                focosProcessados.push(foco);
            }
        }
        
        return focosProcessados;
    }

    async enriquecerFoco(foco) {
        const ponto = turf.point([foco.longitude, foco.latitude]);
        
        // Join com municípios
        if (this.referenciasSpatiais.municipios) {
            const municipio = this.encontrarFeicaoContenedora(
                ponto, 
                this.referenciasSpatiais.municipios
            );
            
            if (municipio) {
                foco.municipio = municipio.properties.NM_MUNICIP || municipio.properties.nome || 'Não identificado';
                foco.estado = municipio.properties.SIGLA_UF || municipio.properties.uf || 'N/A';
                foco.codigo_municipio = municipio.properties.CD_GEOCMU || municipio.properties.codigo || '';
                this.estatisticas.focosComMunicipio++;
            } else {
                foco.municipio = 'Não identificado';
                foco.estado = 'N/A';
                this.estatisticas.focosSemMunicipio++;
            }
        }
        
        // Join com biomas
        if (this.referenciasSpatiais.biomas) {
            const bioma = this.encontrarFeicaoContenedora(
                ponto, 
                this.referenciasSpatiais.biomas
            );
            
            if (bioma) {
                foco.bioma = bioma.properties.NM_BIOMA || bioma.properties.nome || 'Não identificado';
                this.estatisticas.focosComBioma++;
            } else {
                foco.bioma = this.estimarBiomaPorCoordenada(foco.latitude, foco.longitude);
            }
        } else {
            foco.bioma = this.estimarBiomaPorCoordenada(foco.latitude, foco.longitude);
        }
        
        // Join com unidades de conservação (se disponível)
        if (this.referenciasSpatiais.unidadesConservacao) {
            const uc = this.encontrarFeicaoContenedora(
                ponto, 
                this.referenciasSpatiais.unidadesConservacao
            );
            
            if (uc) {
                foco.unidade_conservacao = uc.properties.NOME_UC || uc.properties.nome || 'UC';
                foco.categoria_uc = uc.properties.CATEGORI3 || uc.properties.categoria || 'N/A';
            }
        }
        
        // Join com terras indígenas (se disponível)
        if (this.referenciasSpatiais.terrasIndigenas) {
            const ti = this.encontrarFeicaoContenedora(
                ponto, 
                this.referenciasSpatiais.terrasIndigenas
            );
            
            if (ti) {
                foco.terra_indigena = ti.properties.TERRA_INDI || ti.properties.nome || 'TI';
                foco.etnia = ti.properties.ETNIA || ti.properties.etnia || 'N/A';
            }
        }
        
        return foco;
    }

    encontrarFeicaoContenedora(ponto, geojson) {
        try {
            for (const feature of geojson.features) {
                if (turf.booleanPointInPolygon(ponto, feature)) {
                    return feature;
                }
            }
        } catch (error) {
            // Em caso de erro no turf, retornar null
            return null;
        }
        
        return null;
    }

    estimarBiomaPorCoordenada(lat, lng) {
        // Estimativa simplificada baseada em coordenadas
        // Amazônia: Norte do Brasil
        if (lat > -5 && lng < -55) return 'Amazônia';
        
        // Cerrado: Centro-Oeste e partes do Nordeste/Sudeste
        if (lat > -20 && lat < -5 && lng > -60 && lng < -40) return 'Cerrado';
        
        // Caatinga: Nordeste
        if (lat > -15 && lat < -3 && lng > -45 && lng < -35) return 'Caatinga';
        
        // Mata Atlântica: Litoral
        if (lng > -50 && lng < -35) return 'Mata Atlântica';
        
        // Pantanal: Região específica
        if (lat > -22 && lat < -15 && lng > -60 && lng < -55) return 'Pantanal';
        
        // Pampas: Sul
        if (lat < -28) return 'Pampas';
        
        return 'Não identificado';
    }

    padronizarData(dataString) {
        try {
            // Tentar diferentes formatos de data
            const formatos = [
                /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/, // YYYY-MM-DD HH:MM:SS
                /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/, // DD/MM/YYYY HH:MM:SS
                /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
                /(\d{2})\/(\d{2})\/(\d{4})/ // DD/MM/YYYY
            ];
            
            for (const formato of formatos) {
                const match = dataString.match(formato);
                if (match) {
                    // Converter para ISO string
                    if (formato.source.includes('YYYY')) {
                        return new Date(dataString).toISOString();
                    } else {
                        // DD/MM/YYYY -> YYYY-MM-DD
                        const [, dia, mes, ano] = match;
                        return new Date(`${ano}-${mes}-${dia}`).toISOString();
                    }
                }
            }
            
            // Fallback
            return new Date().toISOString();
            
        } catch (error) {
            return new Date().toISOString();
        }
    }

    calcularEstatisticas(focos) {
        this.estatisticas.totalFocos = focos.length;
        
        // Estatísticas por campo
        const municipios = {};
        const estados = {};
        const biomas = {};
        const satelites = {};
        
        focos.forEach(foco => {
            municipios[foco.municipio] = (municipios[foco.municipio] || 0) + 1;
            estados[foco.estado] = (estados[foco.estado] || 0) + 1;
            biomas[foco.bioma] = (biomas[foco.bioma] || 0) + 1;
            satelites[foco.satelite] = (satelites[foco.satelite] || 0) + 1;
        });
        
        this.estatisticas.municipios = municipios;
        this.estatisticas.estados = estados;
        this.estatisticas.biomas = biomas;
        this.estatisticas.satelites = satelites;
        
        console.log(`📊 Estatísticas finais:`);
        console.log(`   Total de focos: ${this.estatisticas.totalFocos.toLocaleString()}`);
        console.log(`   Focos com município: ${this.estatisticas.focosComMunicipio.toLocaleString()}`);
        console.log(`   Focos sem município: ${this.estatisticas.focosSemMunicipio.toLocaleString()}`);
        console.log(`   Estados únicos: ${Object.keys(estados).length}`);
        console.log(`   Municípios únicos: ${Object.keys(municipios).length}`);
        console.log(`   Biomas únicos: ${Object.keys(biomas).length}`);
    }

    async salvarResultados(focos) {
        console.log('💾 Salvando resultados...');
        
        // Dados completos
        await this.salvarArquivo('focos-completos.json', focos);
        
        // Versão simplificada para dashboard
        const focosSimplificados = focos.map(foco => ({
            id: foco.id,
            latitude: foco.latitude,
            longitude: foco.longitude,
            municipio: foco.municipio,
            estado: foco.estado,
            bioma: foco.bioma,
            satelite: foco.satelite,
            data: foco.data,
            data_hora: foco.data_hora,
            confianca: foco.confianca
        }));
        
        await this.salvarArquivo('focos-dashboard.json', focosSimplificados);
        
        // Estatísticas
        await this.salvarArquivo('estatisticas.json', this.estatisticas);
        
        console.log('✅ Todos os arquivos salvos com sucesso!');
    }

    async salvarArquivo(nomeArquivo, dados) {
        const caminho = path.join(this.diretorioProcessado, nomeArquivo);
        await fs.writeFile(caminho, JSON.stringify(dados, null, 2));
        console.log(`   ✅ ${nomeArquivo}: ${Array.isArray(dados) ? dados.length : 'objeto'} itens`);
    }

    async salvarRelatorioProcessamento() {
        const relatorio = {
            timestamp: new Date().toISOString(),
            versao: '2.0.0-brasil-completo',
            estatisticas: this.estatisticas,
            configuracao: {
                boundsBrasil: this.boundsBrasil,
                referenciasSpatiais: Object.keys(this.referenciasSpatiais).filter(
                    key => this.referenciasSpatiais[key] !== null
                )
            }
        };
        
        await this.salvarArquivo('processing-summary.json', relatorio);
    }

    // Fallbacks para quando não há shapefiles
    async criarMunicipiosSimplificados() {
        // Criar uma grade simplificada baseada em coordenadas conhecidas
        // Este é um fallback muito básico - idealmente usar shapefiles reais
        console.log('📦 Criando referência simplificada de municípios...');
        
        return {
            type: "FeatureCollection",
            features: [] // Retorna vazio para usar estimativa por coordenadas
        };
    }

    async criarBiomasSimplificados() {
        console.log('📦 Criando referência simplificada de biomas...');
        
        return {
            type: "FeatureCollection", 
            features: [] // Retorna vazio para usar estimativa por coordenadas
        };
    }

    async criarReferenciasFallback() {
        this.referenciasSpatiais = {
            municipios: await this.criarMunicipiosSimplificados(),
            biomas: await this.criarBiomasSimplificados(),
            estados: null,
            unidadesConservacao: null,
            terrasIndigenas: null
        };
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const processador = new ProcessadorEspacialBrasil();
    processador.executar()
        .then(() => {
            console.log('🎉 Processamento espacial concluído com sucesso!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Erro fatal no processamento:', error);
            process.exit(1);
        });
}

module.exports = ProcessadorEspacialBrasil;
