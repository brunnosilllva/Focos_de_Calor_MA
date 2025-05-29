// scripts/fetch-data.js - Versão com suporte a subpastas
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
      
      return await response.arrayBuffer(); // Para shapefiles binários
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
    await fs.mkdir(outputDir, { recursive: true });
    
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
      files: downloadedFiles
    }, null, 2));
    
    return downloadedFiles;
  }

  async downloadShapefilesFromFolder(folderId, folderName, outputDir) {
    console.log(`🗂️ Buscando shapefiles na pasta: ${folderName}`);
    
    try {
      const files = await this.listFiles(folderId);
      const shapefileExtensions = ['.shp', '.shx', '.dbf', '.prj', '.cpg', '.sbn', '.sbx'];
      const shapefiles = files.filter(file => 
        shapefileExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      );
      
      console.log(`📄 Encontrados ${shapefiles.length} arquivos shapefile em ${folderName}`);
      
      // Criar subpasta para organizar
      const subDir = path.join(outputDir, folderName.replace(/[^a-zA-Z0-9]/g, '_'));
      await fs.mkdir(subDir, { recursive: true });
      
      for (const file of shapefiles) {
        try {
          console.log(`⬇️ Baixando: ${folderName}/${file.name}`);
          const content = await this.downloadFile(file.id, file.name);
          
          const filePath = path.join(subDir, file.name);
          await fs.writeFile(filePath, Buffer.from(content));
          
          console.log(`✅ ${file.name} baixado com sucesso`);
        } catch (error) {
          console.error(`❌ Erro ao baixar ${file.name}:`, error);
        }
      }
      
      return shapefiles.length;
    } catch (error) {
      console.error(`❌ Erro ao processar pasta ${folderName}:`, error);
      return 0;
    }
  }

  async downloadShapefiles() {
    if (!this.shapefileFolderId) {
      console.log('⚠️ SHAPEFILE_FOLDER_ID não configurado, pulando shapefiles');
      return [];
    }

    console.log('🗺️ Buscando subpastas de shapefiles...');
    
    try {
      const outputDir = path.join(__dirname, '../src/data/shapefiles');
      await fs.mkdir(outputDir, { recursive: true });
      
      // Listar subpastas da pasta "2. Referências Espaciais"
      const items = await this.listFiles(this.shapefileFolderId);
      
      // Filtrar apenas pastas (mimeType = folder)
      const folders = items.filter(item => 
        item.mimeType === 'application/vnd.google-apps.folder'
      );
      
      console.log(`📁 Encontradas ${folders.length} subpastas`);
      
      let totalShapefiles = 0;
      
      // Processar cada subpasta
      for (const folder of folders) {
        console.log(`🔍 Processando pasta: ${folder.name}`);
        const count = await this.downloadShapefilesFromFolder(
          folder.id, 
          folder.name, 
          outputDir
        );
        totalShapefiles += count;
      }
      
      console.log(`🎉 Total de ${totalShapefiles} arquivos shapefile baixados`);
      return totalShapefiles;
      
    } catch (error) {
      console.error('❌ Erro no download de shapefiles:', error);
      throw error;
    }
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
}

async function main() {
  try {
    const fetcher = new GoogleDriveDataFetcher();
    
    // Verificar se há atualizações
    const hasUpdates = await fetcher.checkForUpdates();
    
    if (hasUpdates) {
      console.log('🚀 Iniciando download dos dados...');
      
      // Baixar CSVs
      await fetcher.downloadCSVFiles();
      
      // Baixar shapefiles das subpastas
      await fetcher.downloadShapefiles();
      
      console.log('🎉 Download concluído com sucesso!');
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
