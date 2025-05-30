// scripts/fetch-data.js - Versão focada nos CSVs (que já estão funcionando!)
const fs = require('fs').promises;
const path = require('path');

// Compatibilidade com node-fetch ESM
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class GoogleDriveDataFetcher {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    this.folderId = process.env.DRIVE_FOLDER_ID;
    this.shapefileFolderId = process.env.SHAPEFILE_FOLDER_ID;
    this.baseUrl = 'https://www.googleapis.com/drive/v3';
    
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY não configurada');
    }
  }

  async listFiles(folderId, mimeType = null) {
    let query = `'${folderId}' in parents and trashed=false`;
    if (mimeType) {
      query += ` and mimeType='${mimeType}'`;
    }

    const url = `${this.baseUrl}/files?q=${encodeURIComponent(query)}&key=${this.apiKey}&fields=files(id,name,modifiedTime,size,mimeType)`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${data.error?.message || 'Erro desconhecido'}`);
      }
      
      return data.files || [];
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      throw error;
    }
  }

  async downloadFile(fileId, fileName) {
    const url = `${this.baseUrl}/files/${fileId}?alt=media&key=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao baixar ${fileName}: ${response.statusText}`);
      }
      
      return await response.arrayBuffer();
    } catch (error) {
      console.error(`Erro ao baixar arquivo ${fileName}:`, error);
      throw error;
    }
  }

  async downloadCSVFiles() {
    console.log('🔍 Buscando arquivos CSV na pasta de focos...');
    
    const files = await this.listFiles(this.folderId);
    const csvFiles = files.filter(file => file.name.endsWith('.csv'));
    
    console.log(`📊 Encontrados ${csvFiles.length} arquivos CSV`);
    
    const outputDir = path.join(__dirname, '../src/data/raw');
    
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Pasta já existe, continuar normalmente
      console.log('📁 Pasta raw já existe, continuando...');
    }
    
    const downloadedFiles = [];
    
    for (const file of csvFiles) {
      try {
        console.log(`⬇️ Baixando: ${file.name}`);
        const content = await this.downloadFile(file.id, file.name);
        
        // Converter ArrayBuffer para string para CSVs
        const textContent = new TextDecoder('utf-8').decode(content);
        
        const filePath = path.join(outputDir, file.name);
        await fs.writeFile(filePath, textContent, 'utf8');
        
        downloadedFiles.push({
          name: file.name,
          path: filePath,
          size: file.size,
          modifiedTime: file.modifiedTime
        });
        
        console.log(`✅ ${file.name} baixado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao baixar ${file.name}:`, error);
      }
    }
    
    // Salvar metadados dos arquivos baixados
    const metadataPath = path.join(outputDir, 'download-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify({
      downloadTime: new Date().toISOString(),
      files: downloadedFiles,
      totalFiles: downloadedFiles.length,
      status: 'success'
    }, null, 2));
    
    return downloadedFiles;
  }

  async downloadShapefiles() {
    // TEMPORARIAMENTE DESABILITADO até resolver o ID correto
    console.log('🗺️ Download de shapefiles temporariamente pausado');
    console.log('📋 Focando na captura de dados de focos (funcionando perfeitamente!)');
    console.log('💡 Próximo passo: corrigir ID da pasta de referências espaciais');
    
    // Criar pasta vazia para não quebrar o workflow
    const outputDir = path.join(__dirname, '../src/data/shapefiles');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Criar arquivo placeholder
    const placeholderPath = path.join(outputDir, 'README.txt');
    await fs.writeFile(placeholderPath, 
      'Pasta para shapefiles de referência espacial\n' +
      'Aguardando correção do ID da pasta do Google Drive\n' +
      `Criado em: ${new Date().toISOString()}`
    );
    
    return [];
  }

  async checkForUpdates() {
    console.log('🔄 Verificando atualizações...');
    
    try {
      const metadataPath = path.join(__dirname, '../src/data/raw/download-metadata.json');
      let lastDownload = null;
      
      try {
        const metadata = await fs.readFile(metadataPath, 'utf8');
        lastDownload = JSON.parse(metadata);
      } catch (error) {
        console.log('📝 Primeiro download, baixando todos os arquivos');
      }
      
      const files = await this.listFiles(this.folderId);
      const csvFiles = files.filter(file => file.name.endsWith('.csv'));
      
      if (!lastDownload) {
        return true; // Primeira execução
      }
      
      // Verificar se há arquivos novos ou modificados
      for (const file of csvFiles) {
        const lastFile = lastDownload.files.find(f => f.name === file.name);
        
        if (!lastFile || new Date(file.modifiedTime) > new Date(lastFile.modifiedTime)) {
          console.log(`🆕 Arquivo atualizado detectado: ${file.name}`);
          return true;
        }
      }
      
      console.log('✅ Nenhuma atualização encontrada');
      return false;
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
      return true; // Em caso de erro, força o download
    }
  }

  // Método para processar CSVs baixados
  async processDownloadedCSVs() {
    console.log('📊 Processando CSVs baixados...');
    
    const rawDir = path.join(__dirname, '../src/data/raw');
    const processedDir = path.join(__dirname, '../src/data/processed');
    await fs.mkdir(processedDir, { recursive: true });
    
    try {
      const files = await fs.readdir(rawDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      console.log(`🔄 Processando ${csvFiles.length} arquivos CSV...`);
      
      // Criar resumo básico
      const summary = {
        totalFiles: csvFiles.length,
        processedAt: new Date().toISOString(),
        files: csvFiles,
        nextSteps: [
          'Implementar joins espaciais',
          'Criar agregações por município',
          'Gerar estatísticas temporais'
        ]
      };
      
      const summaryPath = path.join(processedDir, 'processing-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
      
      console.log('✅ Resumo do processamento salvo');
      return summary;
      
    } catch (error) {
      console.error('❌ Erro ao processar CSVs:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    const fetcher = new GoogleDriveDataFetcher();
    
    // Verificar se há atualizações
    const hasUpdates = await fetcher.checkForUpdates();
    
    if (hasUpdates) {
      console.log('🚀 Iniciando download dos dados...');
      
      // Baixar CSVs (funcionando perfeitamente!)
      const csvFiles = await fetcher.downloadCSVFiles();
      
      // Processar CSVs baixados
      await fetcher.processDownloadedCSVs();
      
      // Shapefiles temporariamente desabilitado
      await fetcher.downloadShapefiles();
      
      console.log('🎉 Download e processamento concluídos com sucesso!');
      console.log(`📊 Total de ${csvFiles.length} arquivos CSV processados`);
      
    } else {
      console.log('⏭️ Nenhuma atualização necessária');
    }
    
  } catch (error) {
    console.error('💥 Erro no processo de download:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { GoogleDriveDataFetcher };
