// fetch-data.js - Fetch de dados corrigido para Brasil completo
const fs = require('fs').promises;
const path = require('path');

class FetchDadosBrasil {
    constructor() {
        this.apiKey = process.env.GOOGLE_API_KEY;
        
        // IDs das pastas do Google Drive
        this.pastasConfig = {
            focos: process.env.DRIVE_FOLDER_ID || '1wqXxx9EO6QUINjK1U_6ztOJZJcuqDHZJ', // Pasta "1. Focos"
            referencias: process.env.SHAPEFILE_FOLDER_ID || 'CONFIGURAR_ID_PASTA_2', // Pasta "2. Referências Espaciais"
            backup: process.env.BACKUP_FOLDER_ID || '' // Pasta de backup (opcional)
        };
        
        this.diretorioRaw = './src/data/raw';
        this.diretorioShapefiles = './src/data/shapefiles';
        this.diretorioProcessado = './src/data/processed';
        
        // Estatísticas de download
        this.stats = {
            arquivosBaixados: 0,
            totalBytes: 0,
            erros: 0,
            tempo: 0
        };
    }

    async executar() {
        console.log('🇧🇷 Iniciando fetch de dados para Brasil completo...');
        const inicio = Date.now();
        
        try {
            if (!this.apiKey) {
                throw new Error('GOOGLE_API_KEY não configurada');
            }
            
            // Criar diretórios necessários
            await this.criarDiretorios();
            
            // 1. Baixar arquivos da pasta "1. Focos" (CSVs com todos os focos do Brasil)
            console.log('📊 Baixando dados de focos...');
            await this.baixarPastaFocos();
            
            // 2. Baixar arquivos da pasta "2. Referências Espaciais" (Shapefiles)
            console.log('🗺️ Baixando referências espaciais...');
            await this.baixarPastaReferencias();
            
            // 3. Validar dados baixados
            await this.validarDadosBaixados();
            
            this.stats.tempo = Date.now() - inicio;
            
            // 4. Salvar relatório de download
            await this.salvarRelatorioDownload();
            
            console.log('✅ Fetch concluído com sucesso!');
            this.imprimirEstatisticas();
            
        } catch (error) {
            console.error('❌ Erro no fetch de dados:', error);
            this.stats.erros++;
            throw error;
        }
    }

    async criarDiretorios() {
        const diretorios = [
            this.diretorioRaw,
            this.diretorioShapefiles,
            this.diretorioProcessado
        ];
        
        for (const dir of diretorios) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`📁 Diretório criado/verificado: ${dir}`);
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
            }
        }
    }

    async baixarPastaFocos() {
        try {
            const arquivos = await this.listarArquivosPasta(this.pastasConfig.focos);
            console.log(`📋 Encontrados ${arquivos.length} arquivos na pasta de focos`);
            
            // Filtrar apenas CSVs
            const csvs = arquivos.filter(arquivo => 
                arquivo.name.toLowerCase().endsWith('.csv') ||
                arquivo.name.toLowerCase().endsWith('.xlsx')
            );
            
            console.log(`📊 CSVs para download: ${csvs.length}`);
            
            for (const arquivo of csvs) {
                try {
                    console.log(`⬇️ Baixando: ${arquivo.name}`);
                    await this.baixarArquivo(arquivo, this.diretorioRaw);
                    this.stats.arquivosBaixados++;
                } catch (error) {
                    console.error(`❌ Erro ao baixar ${arquivo.name}:`, error.message);
                    this.stats.erros++;
                }
            }
            
        } catch (error) {
            console.error('❌ Erro ao acessar pasta de focos:', error.message);
            
            // Se não conseguir acessar, criar arquivo de exemplo massivo
            console.log('📦 Criando dados de exemplo para desenvolvimento...');
            await this.criarDadosExemploMassivos();
        }
    }

    async baixarPastaReferencias() {
        try {
            if (this.pastasConfig.referencias === 'CONFIGURAR_ID_PASTA_2') {
                console.warn('⚠️ ID da pasta "2. Referências Espaciais" não configur
